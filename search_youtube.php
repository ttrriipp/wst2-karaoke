<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

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

function text_slice(string $value, int $length): string
{
    if (function_exists('mb_substr')) return mb_substr($value, 0, $length, 'UTF-8');
    if (preg_match('/^.{0,' . $length . '}/us', $value, $match) === 1) return $match[0];
    return substr($value, 0, $length);
}

function youtube_api_key(): string
{
    $environmentKey = getenv('KARAOKUR_YOUTUBE_API_KEY');
    if (is_string($environmentKey) && trim($environmentKey) !== '') return trim($environmentKey);

    $configPath = __DIR__ . DIRECTORY_SEPARATOR . 'youtube_api_config.php';
    if (!is_file($configPath)) return '';

    $config = require $configPath;
    return is_array($config) && is_string($config['api_key'] ?? null)
        ? trim($config['api_key'])
        : '';
}

function fetch_youtube_search(string $url, string $apiKey): array
{
    $body = false;
    $status = 0;

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
                CURLOPT_HTTPHEADER => ['Accept: application/json', 'x-goog-api-key: ' . $apiKey],
                CURLOPT_USERAGENT => 'Karaokur/1.0'
            ]);
            $body = curl_exec($curl);
            $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            curl_close($curl);
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 8,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\nx-goog-api-key: {$apiKey}\r\nUser-Agent: Karaokur/1.0\r\n"
            ],
            'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]
        ]);
        $body = @file_get_contents($url, false, $context);
        foreach ($http_response_header ?? [] as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match) === 1) {
                $status = (int)$match[1];
            }
        }
    }

    return [is_string($body) ? $body : null, $status];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Only POST requests are allowed.']);
}

$title = trim((string)($_POST['title'] ?? ''));
$artist = trim((string)($_POST['artist'] ?? ''));
$lyrics = trim((string)($_POST['lyrics'] ?? ''));

if ($title === '') {
    respond(400, ['success' => false, 'message' => 'Enter the song title before searching.']);
}
if (text_length($title) > 120 || text_length($artist) > 120) {
    respond(400, ['success' => false, 'message' => 'The song title or artist is too long.']);
}
if (text_length($lyrics) > 10000) {
    respond(400, ['success' => false, 'message' => 'Lyrics must be 10,000 characters or less.']);
}

$apiKey = youtube_api_key();
if ($apiKey === '' || $apiKey === 'PASTE_KEY_HERE') {
    respond(503, [
        'success' => false,
        'message' => 'YouTube search needs a Data API key. Add it to youtube_api_config.php, then try again.'
    ]);
}

$lyricHint = '';
foreach (preg_split('/\R/u', $lyrics) ?: [] as $line) {
    $line = trim(preg_replace('/\s+/u', ' ', strip_tags($line)) ?? '');
    if ($line === '' || preg_match('/^\[[^\]]+\]$/u', $line) === 1) continue;
    $lyricHint = text_slice($line, 64);
    break;
}

$queryParts = array_values(array_filter([$title, $artist, 'karaoke instrumental backing track'],
    static fn(string $part): bool => trim($part) !== ''));
if ($lyricHint !== '') $queryParts[] = $lyricHint;
$query = implode(' ', $queryParts);

$parameters = [
    'part' => 'snippet',
    'type' => 'video',
    'q' => $query,
    'maxResults' => 10,
    'regionCode' => 'PH',
    'videoEmbeddable' => 'true',
    'videoSyndicated' => 'true'
];
$url = 'https://www.googleapis.com/youtube/v3/search?' . http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);
[$responseBody, $status] = fetch_youtube_search($url, $apiKey);

if ($responseBody === null || $status === 0) {
    respond(503, ['success' => false, 'message' => 'YouTube search could not connect. Check the internet connection on this computer and try again.']);
}

$payload = json_decode($responseBody, true);
if ($status !== 200 || !is_array($payload)) {
    $reason = is_array($payload)
        ? (string)($payload['error']['errors'][0]['reason'] ?? '')
        : '';
    if (in_array($reason, ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'], true)) {
        respond(429, ['success' => false, 'message' => 'The daily YouTube search limit has been reached. Try again tomorrow.']);
    }
    if (in_array($reason, ['keyInvalid', 'accessNotConfigured', 'forbidden'], true) || $status === 400) {
        respond(503, ['success' => false, 'message' => 'YouTube search is not configured yet. Check the API key and enable YouTube Data API v3.']);
    }
    respond(502, ['success' => false, 'message' => 'YouTube search could not be completed. Please try again.']);
}

$results = [];
foreach (($payload['items'] ?? []) as $item) {
    $videoId = $item['id']['videoId'] ?? null;
    $snippet = $item['snippet'] ?? [];
    if (!is_string($videoId) || preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId) !== 1 || !is_array($snippet)) continue;

    $thumbnail = $snippet['thumbnails']['medium']['url']
        ?? $snippet['thumbnails']['default']['url']
        ?? '';
    if (!is_string($thumbnail) || preg_match('~^https://i\.ytimg\.com/~i', $thumbnail) !== 1) $thumbnail = '';

    $results[] = [
        'videoId' => $videoId,
        'url' => 'https://www.youtube.com/watch?v=' . $videoId,
        'title' => is_string($snippet['title'] ?? null) ? $snippet['title'] : 'YouTube video',
        'channel' => is_string($snippet['channelTitle'] ?? null) ? $snippet['channelTitle'] : 'YouTube',
        'thumbnailUrl' => $thumbnail
    ];
}

respond(200, ['success' => true, 'results' => $results]);
