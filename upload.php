<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function write_all($handle, string $value): bool
{
    $offset = 0;
    $length = strlen($value);
    while ($offset < $length) {
        $written = fwrite($handle, substr($value, $offset));
        if ($written === false || $written === 0) return false;
        $offset += $written;
    }
    return true;
}

require_once __DIR__ . DIRECTORY_SEPARATOR . 'lyrics_timing.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Only POST requests are allowed.']);
}

$title = trim((string)($_POST['title'] ?? ''));
$artist = trim((string)($_POST['artist'] ?? ''));
$pastedLyrics = trim((string)($_POST['lyrics'] ?? ''));
$title = preg_replace('/[\x00-\x1F\x7F]/u', '', $title) ?? '';
$artist = preg_replace('/[\x00-\x1F\x7F]/u', '', $artist) ?? '';

if ($title === '' || $artist === '') {
    respond(400, ['success' => false, 'message' => 'Enter both the song title and artist.']);
}
if (text_length($title) > 120 || text_length($artist) > 120) {
    respond(400, ['success' => false, 'message' => 'Song title and artist must be 120 characters or less.']);
}
if (text_length($pastedLyrics) > 10000) {
    respond(400, ['success' => false, 'message' => 'Lyrics must be 10,000 characters or less.']);
}

if (!isset($_FILES['video']) || !is_array($_FILES['video'])) {
    respond(400, ['success' => false, 'message' => 'Choose a video or song file first.']);
}

$file = $_FILES['video'];
$uploadErrors = [
    UPLOAD_ERR_INI_SIZE   => 'The file exceeds the PHP upload limit.',
    UPLOAD_ERR_FORM_SIZE  => 'The file is too large.',
    UPLOAD_ERR_PARTIAL    => 'The file was only partially uploaded.',
    UPLOAD_ERR_NO_FILE    => 'No file was selected.',
    UPLOAD_ERR_NO_TMP_DIR => 'The server temporary upload folder is missing.',
    UPLOAD_ERR_CANT_WRITE => 'The server could not write the uploaded file.',
    UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the upload.'
];
$uploadError = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($uploadError !== UPLOAD_ERR_OK) {
    respond(400, ['success' => false, 'message' => $uploadErrors[$uploadError] ?? 'The upload failed.']);
}

$maxSize = 500 * 1024 * 1024;
if (!isset($file['size']) || (int)$file['size'] <= 0) {
    respond(400, ['success' => false, 'message' => 'The selected file is empty.']);
}
if ((int)$file['size'] > $maxSize) {
    respond(413, ['success' => false, 'message' => 'Files must be 500 MB or smaller.']);
}

$tmpName = $file['tmp_name'] ?? '';
if (!is_string($tmpName) || $tmpName === '' || !is_uploaded_file($tmpName)) {
    respond(400, ['success' => false, 'message' => 'Invalid upload data.']);
}

$extension = strtolower(pathinfo(basename((string)($file['name'] ?? '')), PATHINFO_EXTENSION));
$allowedMimeTypes = [
    'mp4'  => ['video/mp4', 'application/mp4', 'audio/mp4'],
    'webm' => ['video/webm', 'audio/webm'],
    'ogg'  => ['video/ogg', 'audio/ogg', 'application/ogg'],
    'mp3'  => ['audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3'],
    'wav'  => ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
    'm4a'  => ['audio/mp4', 'audio/x-m4a', 'video/mp4']
];
if (!array_key_exists($extension, $allowedMimeTypes)) {
    respond(415, ['success' => false, 'message' => 'Use MP4, WebM, OGG, MP3, WAV, or M4A.']);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($tmpName);
if (!is_string($mimeType) || !in_array($mimeType, $allowedMimeTypes[$extension], true)) {
    respond(415, ['success' => false, 'message' => 'The file type does not match its extension.']);
}

$timedLyrics = karaoke_lookup_upload_lyrics($title, $artist, $pastedLyrics);

$uploadDirectory = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true) && !is_dir($uploadDirectory)) {
    respond(500, ['success' => false, 'message' => 'Could not create the uploads folder.']);
}

try {
    $fileToken = bin2hex(random_bytes(16));
    $songToken = bin2hex(random_bytes(16));
} catch (Throwable $error) {
    respond(500, ['success' => false, 'message' => 'Could not create a secure song entry.']);
}

$fileName = $fileToken . '.' . $extension;
$destination = $uploadDirectory . DIRECTORY_SEPARATOR . $fileName;
if (!move_uploaded_file($tmpName, $destination)) {
    respond(500, ['success' => false, 'message' => 'The server could not save this song file.']);
}

$song = [
    'id' => 'user-' . $songToken,
    'title' => $title,
    'artist' => $artist,
    'localVideoUrl' => 'uploads/' . $fileName,
    'mediaType' => str_starts_with($mimeType, 'audio/') ? 'audio' : 'video',
    'mimeType' => $mimeType,
    'lyricCues' => $timedLyrics['cues'],
    'timingReferenceDuration' => $timedLyrics['duration'],
    'timingSource' => $timedLyrics['source']
];

$libraryPath = __DIR__ . DIRECTORY_SEPARATOR . 'user_songs.json';
$libraryHandle = fopen($libraryPath, 'c+');
if ($libraryHandle === false || !flock($libraryHandle, LOCK_EX)) {
    if (is_resource($libraryHandle)) fclose($libraryHandle);
    @unlink($destination);
    respond(500, ['success' => false, 'message' => 'The song library could not be opened for saving.']);
}

$originalLibrary = stream_get_contents($libraryHandle);
$libraryData = $originalLibrary === false || trim($originalLibrary) === ''
    ? ['songs' => []]
    : json_decode($originalLibrary, true);
if (!is_array($libraryData) || !isset($libraryData['songs']) || !is_array($libraryData['songs'])) {
    flock($libraryHandle, LOCK_UN);
    fclose($libraryHandle);
    @unlink($destination);
    respond(500, ['success' => false, 'message' => 'The saved song library is invalid; no changes were made.']);
}

$libraryData['songs'][] = $song;
$encodedLibrary = json_encode(
    $libraryData,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
);

$saved = false;
if ($encodedLibrary !== false && rewind($libraryHandle) && ftruncate($libraryHandle, 0)) {
    $saved = write_all($libraryHandle, $encodedLibrary . PHP_EOL) && fflush($libraryHandle);
}

if (!$saved) {
    rewind($libraryHandle);
    ftruncate($libraryHandle, 0);
    if (is_string($originalLibrary)) write_all($libraryHandle, $originalLibrary);
    fflush($libraryHandle);
}
flock($libraryHandle, LOCK_UN);
fclose($libraryHandle);

if (!$saved) {
    @unlink($destination);
    respond(500, ['success' => false, 'message' => 'The song could not be saved to the library.']);
}

respond(200, [
    'success' => true,
    'message' => $timedLyrics['cues']
        ? 'The song was added with matched timed lyrics.'
        : 'The song was added, but timed lyrics could not be found for this title and artist.',
    'lyricsFound' => (bool)$timedLyrics['cues'],
    'song' => $song
]);
