<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function extractYouTubeId(string $url): ?string
{
    $url = trim($url);

    if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
        return null;
    }

    $parts = parse_url($url);

    if (!is_array($parts) || empty($parts['host'])) {
        return null;
    }

    $scheme = strtolower((string)($parts['scheme'] ?? ''));

    if (!in_array($scheme, ['http', 'https'], true)) {
        return null;
    }

    $host = strtolower((string)$parts['host']);
    $host = preg_replace('/^www\./', '', $host);

    $allowedHosts = [
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtu.be'
    ];

    if (!in_array($host, $allowedHosts, true)) {
        return null;
    }

    $videoId = null;

    if ($host === 'youtu.be') {
        $path = trim((string)($parts['path'] ?? ''), '/');
        $segments = $path === '' ? [] : explode('/', $path);
        $videoId = $segments[0] ?? null;
    } else {
        $path = trim((string)($parts['path'] ?? ''), '/');

        if ($path === 'watch') {
            parse_str((string)($parts['query'] ?? ''), $query);
            $videoId = isset($query['v']) && is_string($query['v'])
                ? $query['v']
                : null;
        } else {
            $segments = $path === '' ? [] : explode('/', $path);

            if (
                isset($segments[0], $segments[1]) &&
                in_array($segments[0], ['embed', 'shorts', 'live'], true)
            ) {
                $videoId = $segments[1];
            }
        }
    }

    if (!is_string($videoId)) {
        return null;
    }

    $videoId = trim($videoId);

    return preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId) === 1
        ? $videoId
        : null;
}

function fetchYouTubeTitle(string $videoId): ?string
{
    $oembedUrl = 'https://www.youtube.com/oembed?url=' .
        rawurlencode('https://www.youtube.com/watch?v=' . $videoId) .
        '&format=json';
    $response = false;

    if (function_exists('curl_init')) {
        $curl = curl_init($oembedUrl);

        if ($curl !== false) {
            curl_setopt_array($curl, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 4,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
                CURLOPT_USERAGENT => 'Karaokur/1.0'
            ]);

            $body = curl_exec($curl);
            $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            curl_close($curl);

            if ($status === 200 && is_string($body)) {
                $response = $body;
            }
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'timeout' => 4,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\nUser-Agent: Karaokur/1.0\r\n"
            ]
        ]);
        $body = @file_get_contents($oembedUrl, false, $context);

        if (is_string($body)) {
            $response = $body;
        }
    }

    if (!is_string($response)) {
        return null;
    }

    $metadata = json_decode($response, true);
    $title = is_array($metadata) && isset($metadata['title']) && is_string($metadata['title'])
        ? trim($metadata['title'])
        : '';

    return $title !== '' ? $title : null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'Only POST requests are allowed.'
    ]);
}

if (array_key_exists('videoId', $_POST)) {
    $requestedVideoId = is_string($_POST['videoId']) ? trim($_POST['videoId']) : '';

    if (preg_match('/^[A-Za-z0-9_-]{11}$/', $requestedVideoId) !== 1) {
        respond(400, [
            'success' => false,
            'message' => 'Please enter a valid YouTube video ID.'
        ]);
    }

    respond(200, [
        'success' => true,
        'videoId' => $requestedVideoId,
        'title' => fetchYouTubeTitle($requestedVideoId)
    ]);
}

$url = isset($_POST['url']) && is_string($_POST['url'])
    ? $_POST['url']
    : '';

$videoId = extractYouTubeId($url);

if ($videoId === null) {
    respond(400, [
        'success' => false,
        'message' => 'Please enter a valid YouTube video link.'
    ]);
}

respond(200, [
    'success' => true,
    'videoId' => $videoId
]);
