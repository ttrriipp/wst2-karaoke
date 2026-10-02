<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

function reply(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

require_once __DIR__ . DIRECTORY_SEPARATOR . 'lyrics_timing.php';

function length_of(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function normalized_line(string $value): string
{
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    $value = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $value) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

function infer_video_details(string $videoTitle, string $knownTitle = '', string $knownArtist = ''): array
{
    $cleanTitle = preg_replace('/\s*[\[(][^\])]*(?:karaoke|official|lyric|music video|instrumental|remaster|4k|hd)[^\])]*[\])]\s*/iu', ' ', $videoTitle) ?? $videoTitle;
    $cleanTitle = trim(preg_replace('/\s+/u', ' ', $cleanTitle) ?? $cleanTitle);
    $parts = preg_split('/\s+[-–—|]\s+/u', $cleanTitle, 2) ?: [];

    if (count($parts) >= 2) {
        [$left, $right] = array_map('trim', $parts);
        if ($knownArtist !== '' && normalized_line($left) === normalized_line($knownArtist)) return [$right, $left];
        if ($knownArtist !== '' && normalized_line($right) === normalized_line($knownArtist)) return [$left, $right];
        if ($knownTitle !== '' && normalized_line($left) === normalized_line($knownTitle)) return [$left, $right];
        if ($knownTitle !== '' && normalized_line($right) === normalized_line($knownTitle)) return [$right, $left];
        return [$right, $left];
    }

    if (preg_match('/^(.+?)\s+by\s+(.+)$/iu', $cleanTitle, $match)) {
        return [trim($match[1]), trim($match[2])];
    }

    return [$cleanTitle, 'Unknown artist'];
}

function parse_timed_lyrics(string $lrc): array
{
    $cues = [];
    foreach (preg_split('/\R/u', $lrc) ?: [] as $line) {
        if (!preg_match('/^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)(.*)$/u', trim($line), $match)) continue;
        $text = trim($match[2]);
        if ($text === '') continue;
        preg_match_all('/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/', $match[1], $times, PREG_SET_ORDER);
        foreach ($times as $time) {
            $fraction = isset($time[3]) ? (float)('0.' . str_pad($time[3], 2, '0')) : 0.0;
            $cues[] = ['start' => (int)$time[1] * 60 + (int)$time[2] + $fraction, 'text' => $text];
        }
    }
    usort($cues, static fn(array $a, array $b): int => $a['start'] <=> $b['start']);
    return $cues;
}

function line_matches(string $provided, string $timed): bool
{
    $left = normalized_line($provided);
    $right = normalized_line($timed);
    if ($left === '' || $right === '') return false;
    if ($left === $right) return true;
    similar_text($left, $right, $percent);
    return $percent >= 86;
}

function match_lyrics(array $provided, array $timed): ?array
{
    $result = [];
    $cursor = 0;
    foreach ($provided as $line) {
        $found = false;
        for ($index = $cursor; $index < min(count($timed), $cursor + 8); $index++) {
            if (!line_matches($line, $timed[$index]['text'])) continue;
            $result[] = ['start' => round((float)$timed[$index]['start'], 2), 'text' => $line];
            $cursor = $index + 1;
            $found = true;
            break;
        }
        if (!$found) return match_lyrics_by_words($provided, $timed);
    }
    return $result;
}

function match_lyrics_by_words(array $provided, array $timed): ?array
{
    $words = [];
    foreach ($timed as $index => $cue) {
        $tokens = explode(' ', normalized_line($cue['text']));
        $tokens = array_values(array_filter($tokens, static fn(string $word): bool => $word !== ''));
        if (!$tokens) continue;
        $next = (float)($timed[$index + 1]['start'] ?? ($cue['start'] + 4));
        $span = max(0.5, min(8.0, $next - (float)$cue['start']));
        foreach ($tokens as $position => $token) {
            $words[] = [
                'word' => $token,
                'start' => round((float)$cue['start'] + $span * $position / count($tokens), 2)
            ];
        }
    }

    $result = [];
    $cursor = 0;
    foreach ($provided as $line) {
        $tokens = explode(' ', normalized_line($line));
        $tokens = array_values(array_filter($tokens, static fn(string $word): bool => $word !== ''));
        if (!$tokens) return null;
        $found = false;
        $lastStart = min(count($words) - count($tokens), $cursor + 60);
        for ($index = $cursor; $index <= $lastStart; $index++) {
            $matched = true;
            foreach ($tokens as $offset => $token) {
                if ($words[$index + $offset]['word'] !== $token) {
                    $matched = false;
                    break;
                }
            }
            if (!$matched) continue;
            $result[] = ['start' => $words[$index]['start'], 'text' => $line];
            $cursor = $index + count($tokens);
            $found = true;
            break;
        }
        if (!$found) return null;
    }
    return $result;
}

function fetch_timed_records(string $title, string $artist, string $keyword = ''): ?array
{
    $cooldownPath = __DIR__ . DIRECTORY_SEPARATOR . '.lrclib_cooldown';
    $cooldownUntil = is_file($cooldownPath) ? (int)@file_get_contents($cooldownPath) : 0;
    if ($cooldownUntil > time()) return [];

    $query = $keyword !== '' ? ['q' => $keyword] : ['track_name' => $title];
    if ($keyword === '' && $artist !== '') $query['artist_name'] = $artist;
    $url = 'https://lrclib.net/api/search?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    $body = false;
    $status = 0;
    $retryAfter = 60;
    $userAgent = 'Karaokur/1.0 (http://localhost/wst2-karaoke/)';
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl !== false) {
            curl_setopt_array($curl, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_TIMEOUT => 8,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_USERAGENT => $userAgent,
                CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$retryAfter): int {
                    if (stripos($line, 'Retry-After:') === 0) {
                        $retryAfter = max(1, min(3600, (int)trim(substr($line, 12))));
                    }
                    return strlen($line);
                },
                CURLOPT_HTTPHEADER => ['Accept: application/json']
            ]);
            $response = curl_exec($curl);
            $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            curl_close($curl);
            if ($status === 200 && is_string($response) && strlen($response) <= 2_000_000) $body = $response;
        }
    } else {
        $context = stream_context_create(['http' => [
            'timeout' => 8,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nUser-Agent: {$userAgent}\r\n"
        ]]);
        $response = @file_get_contents($url, false, $context);
        foreach ($http_response_header ?? [] as $headerLine) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $headerLine, $match)) $status = (int)$match[1];
            if (stripos($headerLine, 'Retry-After:') === 0) {
                $retryAfter = max(1, min(3600, (int)trim(substr($headerLine, 12))));
            }
        }
        if ($status === 200 && is_string($response) && strlen($response) <= 2_000_000) $body = $response;
    }
    if ($status === 429) {
        @file_put_contents($cooldownPath, (string)(time() + $retryAfter), LOCK_EX);
        return [];
    }
    if (!is_string($body)) return null;
    $records = json_decode($body, true);
    return is_array($records) ? $records : null;
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

$title = trim((string)($_POST['title'] ?? ''));
$artist = trim((string)($_POST['artist'] ?? ''));
$videoTitle = trim((string)($_POST['videoTitle'] ?? ''));
$videoId = trim((string)($_POST['videoId'] ?? ''));
$lyrics = trim((string)($_POST['lyrics'] ?? ''));
$title = preg_replace('/[\x00-\x1F\x7F]/u', '', $title) ?? '';
$artist = preg_replace('/[\x00-\x1F\x7F]/u', '', $artist) ?? '';

if (length_of($title) > 120 || length_of($artist) > 120 || length_of($videoTitle) > 300) {
    reply(400, ['success' => false, 'message' => 'Song details are too long.']);
}
if ($title === '' && $videoTitle === '') {
    reply(400, ['success' => false, 'message' => 'Could not read the YouTube title. Open Song details and enter the song title and artist.']);
}
if (preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId) !== 1) {
    reply(400, ['success' => false, 'message' => 'Enter a valid YouTube link.']);
}
if (length_of($lyrics) > 10000) {
    reply(400, ['success' => false, 'message' => 'Lyrics must be 10,000 characters or less.']);
}

$provided = array_values(array_filter(array_map('trim', preg_split('/\R/u', $lyrics) ?: []),
    static fn(string $line): bool => $line !== '' && preg_match('/^\[[^\]]+\]$/u', $line) !== 1));
if (count($provided) > 180) reply(400, ['success' => false, 'message' => 'Paste 180 lyric lines or fewer.']);
if ($provided && count($provided) < 3) $provided = [];

$queries = [];
if ($title !== '') {
    $queries[] = [$title, $artist, ''];
} else {
    $cleanVideoTitle = preg_replace('/\s*[\[(][^\])]*(?:karaoke|official|lyric|music video|instrumental|remaster|4k|hd)[^\])]*[\])]\s*/iu', ' ', $videoTitle) ?? $videoTitle;
    $cleanVideoTitle = trim(preg_replace('/\s+/u', ' ', $cleanVideoTitle) ?? $cleanVideoTitle);
    $parts = preg_split('/\s+[-–—|]\s+/u', $cleanVideoTitle, 3) ?: [];
    if (count($parts) >= 2) {
        $queries[] = [trim($parts[1]), trim($parts[0]), ''];
        $queries[] = [trim($parts[0]), trim($parts[1]), ''];
    } elseif (preg_match('/^(.+?)\s+by\s+(.+)$/iu', $cleanVideoTitle, $match)) {
        $queries[] = [trim($match[1]), trim($match[2]), ''];
    } else {
        $queries[] = ['', '', $cleanVideoTitle];
    }
}

$matched = null;
$referenceDuration = null;
$matchedRecord = null;
foreach ($queries as $queryIndex => [$queryTitle, $queryArtist, $keyword]) {
    if ($queryIndex > 0) usleep(300000);
    $records = fetch_timed_records($queryTitle, $queryArtist, $keyword);
    if ($records === null) {
        break;
    }
    foreach ($records as $record) {
        if (!is_array($record)) continue;
        if ($queryTitle !== '' && normalized_line((string)($record['trackName'] ?? '')) !== normalized_line($queryTitle)) continue;
        if (!$provided && $queryArtist !== '' && normalized_line((string)($record['artistName'] ?? '')) !== normalized_line($queryArtist)) continue;
        $lyricsfileCues = karaoke_parse_lyricsfile_cues((string)($record['lyricsfile'] ?? ''));
        $timed = parse_timed_lyrics((string)($record['syncedLyrics'] ?? ''));
        if (!$timed) $timed = $lyricsfileCues;
        if (!$timed) continue;
        $candidate = $provided ? match_lyrics($provided, $timed) : ($lyricsfileCues ?: $timed);
        if ($candidate === null) continue;
        if ($lyricsfileCues) $candidate = karaoke_attach_word_timings($candidate, $lyricsfileCues);
        $matched = $candidate;
        $matchedRecord = $record;
        $referenceDuration = is_numeric($record['duration'] ?? null) ? (int)$record['duration'] : null;
        break 2;
    }
}

if ($matched === null) $matched = [];

$wordTimingAvailable = false;
foreach ($matched as $cue) {
    if (!empty($cue['wordTimings'])) {
        $wordTimingAvailable = true;
        break;
    }
}

[$inferredTitle, $inferredArtist] = infer_video_details($videoTitle, $title, $artist);
$title = $title !== '' ? $title : (trim((string)($matchedRecord['trackName'] ?? '')) ?: $inferredTitle);
$artist = $artist !== '' ? $artist : (trim((string)($matchedRecord['artistName'] ?? '')) ?: $inferredArtist);

try {
    $songId = 'youtube-' . bin2hex(random_bytes(16));
} catch (Throwable $error) {
    reply(500, ['success' => false, 'message' => 'Could not create a song entry.']);
}

$song = [
    'id' => $songId,
    'title' => $title,
    'artist' => $artist,
    'video' => ['videoId' => $videoId, 'title' => $title . ' — ' . $artist],
    'lyricCues' => $matched,
    'timingReferenceDuration' => $referenceDuration,
    'timingSource' => $matched ? 'lrclib' : null
];

$path = __DIR__ . DIRECTORY_SEPARATOR . 'user_songs.json';
$handle = fopen($path, 'c+');
if ($handle === false || !flock($handle, LOCK_EX)) {
    if (is_resource($handle)) fclose($handle);
    reply(500, ['success' => false, 'message' => 'The song library could not be opened.']);
}

$original = stream_get_contents($handle);
$library = $original === false || trim($original) === '' ? ['songs' => []] : json_decode($original, true);
if (!is_array($library) || !isset($library['songs']) || !is_array($library['songs'])) {
    flock($handle, LOCK_UN);
    fclose($handle);
    reply(500, ['success' => false, 'message' => 'The saved song library is invalid; no changes were made.']);
}
$library['songs'][] = $song;
$encoded = json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
$saved = $encoded !== false && rewind($handle) && ftruncate($handle, 0)
    && write_all($handle, $encoded . PHP_EOL) && fflush($handle);
if (!$saved) {
    rewind($handle);
    ftruncate($handle, 0);
    if (is_string($original)) write_all($handle, $original);
    fflush($handle);
}
flock($handle, LOCK_UN);
fclose($handle);
if (!$saved) reply(500, ['success' => false, 'message' => 'The song could not be saved to the library.']);

reply(200, [
    'success' => true,
    'message' => $matched
        ? ($provided ? 'YouTube song and matched lyrics added to the library.' : 'YouTube song and automatically found lyrics added to the library.')
        : 'YouTube song added to the library without timed lyrics.',
    'lyricsFound' => (bool)$matched,
    'wordTimingAvailable' => $wordTimingAvailable,
    'song' => $song
]);
