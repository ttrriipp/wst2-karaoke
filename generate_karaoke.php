<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function worker_is_online(string $jobsDirectory): bool
{
    $heartbeat = $jobsDirectory . DIRECTORY_SEPARATOR . '.worker-heartbeat';
    return is_file($heartbeat) && (time() - (int)filemtime($heartbeat)) <= 30;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Only POST requests are allowed.']);
}

if (!isset($_FILES['media']) || !is_array($_FILES['media'])) {
    respond(400, ['success' => false, 'message' => 'Choose a video or audio file first.']);
}

$file = $_FILES['media'];
$uploadErrors = [
    UPLOAD_ERR_INI_SIZE   => 'The file exceeds the PHP upload limit.',
    UPLOAD_ERR_FORM_SIZE  => 'The file is too large.',
    UPLOAD_ERR_PARTIAL    => 'The file was only partially uploaded.',
    UPLOAD_ERR_NO_FILE    => 'No file was selected.',
    UPLOAD_ERR_NO_TMP_DIR => 'The server temporary upload folder is missing.',
    UPLOAD_ERR_CANT_WRITE => 'The server could not write the uploaded file.',
    UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the upload.'
];

if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    respond(400, ['success' => false, 'message' => $uploadErrors[$code] ?? 'The upload failed.']);
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

$originalName = basename((string)($file['name'] ?? 'song'));
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedMimeTypes = [
    'mp4'  => ['video/mp4'],
    'webm' => ['video/webm'],
    'ogg'  => ['video/ogg', 'audio/ogg', 'application/ogg'],
    'mp3'  => ['audio/mpeg', 'audio/mp3', 'audio/mpeg3'],
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

$lyrics = trim((string)($_POST['lyrics'] ?? ''));
$lyricsLength = function_exists('mb_strlen') ? mb_strlen($lyrics, 'UTF-8') : strlen($lyrics);
if ($lyricsLength > 10000) {
    respond(413, ['success' => false, 'message' => 'Pasted lyrics must be 10,000 characters or less.']);
}

$jobsDirectory = __DIR__ . DIRECTORY_SEPARATOR . '.karaoke_jobs';
if (!is_dir($jobsDirectory) && !mkdir($jobsDirectory, 0700, true) && !is_dir($jobsDirectory)) {
    respond(500, ['success' => false, 'message' => 'Could not create the karaoke job folder.']);
}

try {
    $jobId = bin2hex(random_bytes(16));
} catch (Throwable $e) {
    respond(500, ['success' => false, 'message' => 'Could not create a secure karaoke job.']);
}

$jobDirectory = $jobsDirectory . DIRECTORY_SEPARATOR . $jobId;
if (!mkdir($jobDirectory, 0700)) {
    respond(500, ['success' => false, 'message' => 'Could not create the karaoke job.']);
}

$sourcePath = $jobDirectory . DIRECTORY_SEPARATOR . 'source.' . $extension;
if (!move_uploaded_file($tmpName, $sourcePath)) {
    @rmdir($jobDirectory);
    respond(500, ['success' => false, 'message' => 'The server could not save the uploaded file.']);
}

if ($lyrics !== '' && file_put_contents($jobDirectory . DIRECTORY_SEPARATOR . 'lyrics.txt', $lyrics, LOCK_EX) === false) {
    @unlink($sourcePath);
    @rmdir($jobDirectory);
    respond(500, ['success' => false, 'message' => 'The server could not save the supplied lyrics.']);
}

$title = trim((string)pathinfo($originalName, PATHINFO_FILENAME));
if ($title === '') $title = 'Karaoke track';
$title = function_exists('mb_substr')
    ? mb_substr($title, 0, 120, 'UTF-8')
    : substr($title, 0, 120);

$status = [
    'success' => true,
    'job' => $jobId,
    'status' => 'queued',
    'stage' => 'Waiting for the local karaoke worker',
    'progress' => 0,
    'title' => $title,
    'message' => '',
    'updatedAt' => time()
];

$statusJson = json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($statusJson === false || file_put_contents($jobDirectory . DIRECTORY_SEPARATOR . 'status.json', $statusJson, LOCK_EX) === false) {
    respond(500, ['success' => false, 'message' => 'Could not create the karaoke job status.']);
}

if (file_put_contents($jobDirectory . DIRECTORY_SEPARATOR . 'queued.flag', 'queued', LOCK_EX) === false) {
    respond(500, ['success' => false, 'message' => 'Could not add the karaoke job to the queue.']);
}

respond(200, [
    'success' => true,
    'job' => $jobId,
    'status' => 'queued',
    'workerOnline' => worker_is_online($jobsDirectory),
    'message' => 'The file was uploaded and added to the karaoke queue.'
]);
