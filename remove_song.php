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

$songId = trim((string)($_POST['id'] ?? ''));
if ($songId === '' || preg_match('/^[A-Za-z0-9_-]{1,100}$/', $songId) !== 1) {
    reply(400, ['success' => false, 'message' => 'Choose a valid song to remove.']);
}

$libraryPath = __DIR__ . DIRECTORY_SEPARATOR . 'user_songs.json';
$handle = fopen($libraryPath, 'c+');
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

$removedSong = null;
$remainingSongs = [];
foreach ($library['songs'] as $song) {
    if (is_array($song) && ($song['id'] ?? null) === $songId) {
        $removedSong = $song;
        continue;
    }
    $remainingSongs[] = $song;
}
if ($removedSong === null) {
    flock($handle, LOCK_UN);
    fclose($handle);
    reply(404, ['success' => false, 'message' => 'That song is no longer in your library. Refresh the page and try again.']);
}

$library['songs'] = $remainingSongs;
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
if (!$saved) reply(500, ['success' => false, 'message' => 'The song could not be removed. No library changes were saved.']);

$fileDeleted = true;
$relativePath = $removedSong['localVideoUrl'] ?? '';
if (is_string($relativePath) && preg_match('~^uploads/[a-f0-9]{32}\.(mp4|webm|ogg|mp3|wav|m4a)$~i', $relativePath) === 1) {
    $uploadsDirectory = realpath(__DIR__ . DIRECTORY_SEPARATOR . 'uploads');
    $mediaPath = realpath(__DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
    if ($mediaPath !== false && $uploadsDirectory !== false && dirname($mediaPath) === $uploadsDirectory && is_file($mediaPath)) {
        $fileDeleted = @unlink($mediaPath);
    }
}

reply(200, [
    'success' => true,
    'message' => 'The song was removed from your library.',
    'fileDeleted' => $fileDeleted
]);
