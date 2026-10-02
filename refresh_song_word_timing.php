<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

require_once __DIR__ . DIRECTORY_SEPARATOR . 'lyrics_timing.php';

function reply(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function write_all($handle, string $contents): bool
{
    $offset = 0;
    $length = strlen($contents);
    while ($offset < $length) {
        $written = fwrite($handle, substr($contents, $offset));
        if ($written === false || $written === 0) return false;
        $offset += $written;
    }
    return true;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['success' => false, 'message' => 'Only POST requests are allowed.']);
}

$songId = trim((string)($_POST['songId'] ?? ''));
if (preg_match('/^(?:youtube|user|local)-[A-Za-z0-9_-]{5,128}$/', $songId) !== 1) {
    reply(400, ['success' => false, 'message' => 'Choose a saved song from your library first.']);
}
$requestedDuration = is_numeric($_POST['videoDuration'] ?? null) ? (float)$_POST['videoDuration'] : null;
if ($requestedDuration !== null && ($requestedDuration <= 0 || $requestedDuration > 86400)) $requestedDuration = null;

$path = __DIR__ . DIRECTORY_SEPARATOR . 'user_songs.json';
$original = @file_get_contents($path);
$library = is_string($original) ? json_decode($original, true) : null;
if (!is_array($library) || !isset($library['songs']) || !is_array($library['songs'])) {
    reply(500, ['success' => false, 'message' => 'The saved song library could not be read.']);
}

$songIndex = null;
foreach ($library['songs'] as $index => $song) {
    if (is_array($song) && ($song['id'] ?? null) === $songId) {
        $songIndex = $index;
        break;
    }
}
if ($songIndex === null) {
    reply(404, ['success' => false, 'message' => 'This song is not in the saved song library.']);
}

$song = $library['songs'][$songIndex];
$title = trim((string)($song['title'] ?? ''));
$artist = trim((string)($song['artist'] ?? ''));
$existingCues = is_array($song['lyricCues'] ?? null) ? $song['lyricCues'] : [];
if ($title === '' || $artist === '' || !$existingCues) {
    reply(422, ['success' => false, 'message' => 'This song does not have saved lyrics to time.']);
}

$bestCues = null;
$bestWordTimingLines = 0;
$bestDurationDistance = INF;
$bestDuration = null;
$titleKey = karaoke_normalize_lyric_text($title);
$artistKey = karaoke_normalize_lyric_text($artist);
$referenceDuration = $requestedDuration ?? (is_numeric($song['timingReferenceDuration'] ?? null)
    ? (float)$song['timingReferenceDuration']
    : null);

foreach (karaoke_fetch_timed_lyric_records($title, $artist) as $record) {
    if (!is_array($record)) continue;
    if (karaoke_normalize_lyric_text((string)($record['trackName'] ?? '')) !== $titleKey) continue;
    if (karaoke_normalize_lyric_text((string)($record['artistName'] ?? '')) !== $artistKey) continue;

    $sourceCues = karaoke_parse_lyricsfile_cues((string)($record['lyricsfile'] ?? ''));
    if (!$sourceCues) continue;
    $candidateCues = karaoke_attach_word_timings($existingCues, $sourceCues);
    $wordTimingLines = count(array_filter($candidateCues, static fn(array $cue): bool => !empty($cue['wordTimings'])));
    if ($wordTimingLines === 0) continue;

    $candidateDuration = is_numeric($record['duration'] ?? null) ? (float)$record['duration'] : null;
    $durationDistance = $referenceDuration !== null && $candidateDuration !== null
        ? abs($referenceDuration - $candidateDuration)
        : INF;
    if ($bestCues === null || $wordTimingLines > $bestWordTimingLines
        || ($wordTimingLines === $bestWordTimingLines && $durationDistance < $bestDurationDistance)) {
        $bestCues = $candidateCues;
        $bestWordTimingLines = $wordTimingLines;
        $bestDurationDistance = $durationDistance;
        $bestDuration = $candidateDuration;
    }
}

if ($bestCues === null) {
    reply(422, [
        'success' => false,
        'message' => 'No exact word timestamps are available for this song from the timing source. The player can only estimate word timing.'
    ]);
}

$handle = @fopen($path, 'c+');
if ($handle === false || !flock($handle, LOCK_EX)) {
    if (is_resource($handle)) fclose($handle);
    reply(500, ['success' => false, 'message' => 'The saved song library could not be updated.']);
}

rewind($handle);
$lockedContents = stream_get_contents($handle);
$currentLibrary = is_string($lockedContents) ? json_decode($lockedContents, true) : null;
if (!is_array($currentLibrary) || !isset($currentLibrary['songs']) || !is_array($currentLibrary['songs'])) {
    flock($handle, LOCK_UN);
    fclose($handle);
    reply(500, ['success' => false, 'message' => 'The saved song library is invalid; no changes were made.']);
}

$updatedSong = null;
foreach ($currentLibrary['songs'] as $index => $currentSong) {
    if (!is_array($currentSong) || ($currentSong['id'] ?? null) !== $songId) continue;
    $currentSong['lyricCues'] = $bestCues;
    if ($bestDuration !== null) $currentSong['timingReferenceDuration'] = $bestDuration;
    $currentSong['timingSource'] = 'lrclib';
    $currentLibrary['songs'][$index] = $currentSong;
    $updatedSong = $currentSong;
    break;
}

if ($updatedSong === null) {
    flock($handle, LOCK_UN);
    fclose($handle);
    reply(404, ['success' => false, 'message' => 'This song was removed while its timing was being updated.']);
}

$encoded = json_encode($currentLibrary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
$saved = $encoded !== false && rewind($handle) && ftruncate($handle, 0)
    && write_all($handle, $encoded . PHP_EOL) && fflush($handle);
if (!$saved) {
    rewind($handle);
    ftruncate($handle, 0);
    if (is_string($lockedContents)) write_all($handle, $lockedContents);
    fflush($handle);
}
flock($handle, LOCK_UN);
fclose($handle);
if (!$saved) reply(500, ['success' => false, 'message' => 'The song timing could not be saved.']);

reply(200, [
    'success' => true,
    'song' => $updatedSong,
    'wordTimingLines' => $bestWordTimingLines,
    'totalLines' => count($bestCues)
]);
