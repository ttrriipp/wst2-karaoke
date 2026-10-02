<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(405, ['success' => false, 'message' => 'Only GET requests are allowed.']);
}

$jobId = (string)($_GET['job'] ?? '');
if (!preg_match('/\A[a-f0-9]{32}\z/', $jobId)) {
    respond(400, ['success' => false, 'message' => 'Invalid karaoke job.']);
}

$jobsDirectory = __DIR__ . DIRECTORY_SEPARATOR . '.karaoke_jobs';
$jobDirectory = $jobsDirectory . DIRECTORY_SEPARATOR . $jobId;
$statusPath = $jobDirectory . DIRECTORY_SEPARATOR . 'status.json';
if (!is_file($statusPath)) {
    respond(404, ['success' => false, 'message' => 'Karaoke job not found.']);
}

$rawStatus = file_get_contents($statusPath);
$status = is_string($rawStatus) ? json_decode($rawStatus, true) : null;
if (!is_array($status)) {
    respond(503, ['success' => false, 'message' => 'Karaoke job status is not available yet.']);
}

$heartbeat = $jobsDirectory . DIRECTORY_SEPARATOR . '.worker-heartbeat';
$status['workerOnline'] = is_file($heartbeat) && (time() - (int)filemtime($heartbeat)) <= 30;
$status['success'] = true;
respond(200, $status);
