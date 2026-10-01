<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'Only POST requests are allowed.'
    ]);
}

if (!isset($_FILES['video']) || !is_array($_FILES['video'])) {
    respond(400, [
        'success' => false,
        'message' => 'No video file was received.'
    ]);
}

$file = $_FILES['video'];

$uploadErrors = [
    UPLOAD_ERR_INI_SIZE   => 'The video exceeds the PHP upload limit.',
    UPLOAD_ERR_FORM_SIZE  => 'The video is too large.',
    UPLOAD_ERR_PARTIAL    => 'The video was only partially uploaded.',
    UPLOAD_ERR_NO_FILE    => 'No video was selected.',
    UPLOAD_ERR_NO_TMP_DIR => 'The server temporary upload folder is missing.',
    UPLOAD_ERR_CANT_WRITE => 'The server could not write the uploaded file.',
    UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the upload.'
];

if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);

    respond(400, [
        'success' => false,
        'message' => $uploadErrors[$code] ?? 'Unknown upload error.'
    ]);
}

$maxSize = 500 * 1024 * 1024;

if (!isset($file['size']) || (int)$file['size'] <= 0) {
    respond(400, [
        'success' => false,
        'message' => 'The uploaded file is empty.'
    ]);
}

if ((int)$file['size'] > $maxSize) {
    respond(413, [
        'success' => false,
        'message' => 'Video must be 500 MB or smaller.'
    ]);
}

$tmpName = $file['tmp_name'] ?? '';

if (!is_string($tmpName) || $tmpName === '' || !is_uploaded_file($tmpName)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid upload data.'
    ]);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($tmpName);

$allowedTypes = [
    'video/mp4'        => 'mp4',
    'video/webm'       => 'webm',
    'video/ogg'        => 'ogg',
    'application/ogg'  => 'ogg'
];

if (!is_string($mimeType) || !array_key_exists($mimeType, $allowedTypes)) {
    respond(415, [
        'success' => false,
        'message' => 'Only valid MP4, WebM, and OGG video files are allowed.'
    ]);
}

$uploadDirectory = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';

if (!is_dir($uploadDirectory)) {
    if (!mkdir($uploadDirectory, 0755, true) && !is_dir($uploadDirectory)) {
        respond(500, [
            'success' => false,
            'message' => 'Could not create the uploads directory.'
        ]);
    }
}

try {
    $randomName = bin2hex(random_bytes(16));
} catch (Throwable $e) {
    respond(500, [
        'success' => false,
        'message' => 'Could not generate a secure filename.'
    ]);
}

$extension = $allowedTypes[$mimeType];
$fileName = $randomName . '.' . $extension;
$destination = $uploadDirectory . DIRECTORY_SEPARATOR . $fileName;

if (!move_uploaded_file($tmpName, $destination)) {
    respond(500, [
        'success' => false,
        'message' => 'The server could not save the uploaded video.'
    ]);
}

respond(200, [
    'success' => true,
    'message' => 'Video uploaded successfully.',
    'file' => 'uploads/' . rawurlencode($fileName)
]);
