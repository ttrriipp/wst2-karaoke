<?php
declare(strict_types=1);

function fail_download(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=UTF-8');
    header('Cache-Control: no-store');
    echo $message;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    fail_download(405, 'Only GET requests are allowed.');
}

$jobId = (string)($_GET['job'] ?? '');
$kind = (string)($_GET['file'] ?? '');
if (!preg_match('/\A[a-f0-9]{32}\z/', $jobId) || !in_array($kind, ['video', 'audio'], true)) {
    fail_download(400, 'Invalid karaoke download.');
}

$jobsDirectory = __DIR__ . DIRECTORY_SEPARATOR . '.karaoke_jobs';
$jobDirectory = $jobsDirectory . DIRECTORY_SEPARATOR . $jobId;
$statusPath = $jobDirectory . DIRECTORY_SEPARATOR . 'status.json';
if (!is_file($statusPath)) {
    fail_download(404, 'Karaoke job not found.');
}

$status = json_decode((string)file_get_contents($statusPath), true);
if (!is_array($status) || ($status['status'] ?? '') !== 'complete') {
    fail_download(409, 'This karaoke file is not ready yet.');
}

$isVideo = $kind === 'video';
$filePath = $jobDirectory . DIRECTORY_SEPARATOR . ($isVideo ? 'karaoke.mp4' : 'instrumental.mp3');
if (!is_file($filePath)) {
    fail_download(404, 'The requested karaoke file is missing.');
}

$fileSize = (int)filesize($filePath);
$start = 0;
$end = max(0, $fileSize - 1);
$httpStatus = 200;
$rangeHeader = $_SERVER['HTTP_RANGE'] ?? '';
if (is_string($rangeHeader) && preg_match('/\Abytes=(\d*)-(\d*)\z/', trim($rangeHeader), $matches)) {
    if ($matches[1] === '' && $matches[2] !== '') {
        $suffixLength = (int)$matches[2];
        $start = max(0, $fileSize - $suffixLength);
    } else {
        $start = (int)$matches[1];
        if ($matches[2] !== '') $end = min($end, (int)$matches[2]);
    }

    if ($start > $end || $start >= $fileSize) {
        header('Content-Range: bytes */' . $fileSize);
        fail_download(416, 'Requested byte range is not available.');
    }
    $httpStatus = 206;
}

http_response_code($httpStatus);
header('Content-Type: ' . ($isVideo ? 'video/mp4' : 'audio/mpeg'));
header('Content-Length: ' . ($end - $start + 1));
header('Accept-Ranges: bytes');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=3600');
header('Content-Disposition: ' . ($isVideo ? 'inline' : 'attachment') . '; filename="' . ($isVideo ? 'karaokur-karaoke.mp4' : 'karaokur-instrumental.mp3') . '"');
if ($httpStatus === 206) {
    header('Content-Range: bytes ' . $start . '-' . $end . '/' . $fileSize);
}

$stream = fopen($filePath, 'rb');
if ($stream === false || fseek($stream, $start) !== 0) {
    fail_download(500, 'Could not read the karaoke file.');
}

$remaining = $end - $start + 1;
while ($remaining > 0 && !feof($stream)) {
    $chunk = fread($stream, min(1024 * 1024, $remaining));
    if ($chunk === false || $chunk === '') break;
    echo $chunk;
    $remaining -= strlen($chunk);
}
fclose($stream);
