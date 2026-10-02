<?php
declare(strict_types=1);

function karaoke_normalize_lyric_text(string $value): string
{
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    $value = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $value) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

function karaoke_parse_timed_lyrics(string $lrc): array
{
    $cues = [];
    foreach (preg_split('/\R/u', $lrc) ?: [] as $line) {
        if (!preg_match('/^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)(.*)$/u', trim($line), $match)) continue;
        $text = trim($match[2]);
        if ($text === '') continue;
        preg_match_all('/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/', $match[1], $times, PREG_SET_ORDER);
        foreach ($times as $time) {
            $fraction = isset($time[3]) ? (float)('0.' . str_pad($time[3], 2, '0')) : 0.0;
            $cues[] = [
                'start' => (int)$time[1] * 60 + (int)$time[2] + $fraction,
                'text' => $text
            ];
        }
    }
    usort($cues, static fn(array $left, array $right): int => $left['start'] <=> $right['start']);
    return $cues;
}

function karaoke_lyricsfile_scalar(string $value): string
{
    $value = trim($value);
    if (strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"') {
        $decoded = json_decode($value, true);
        return is_string($decoded) ? $decoded : substr($value, 1, -1);
    }
    if (strlen($value) >= 2 && $value[0] === "'" && substr($value, -1) === "'") {
        return str_replace("''", "'", substr($value, 1, -1));
    }
    return trim(preg_replace('/\s+#.*$/u', '', $value) ?? $value);
}

function karaoke_parse_lyricsfile_cues(string $lyricsfile): array
{
    $result = [];
    $inLines = false;
    $lineIndent = null;
    $wordsIndent = null;
    $lineIndex = null;
    $wordIndex = null;

    foreach (preg_split('/\R/u', $lyricsfile) ?: [] as $rawLine) {
        $trimmed = trim($rawLine);
        if (!$inLines) {
            if ($trimmed === 'lines:') $inLines = true;
            continue;
        }

        $indent = strlen($rawLine) - strlen(ltrim($rawLine, ' '));
        if ($indent === 0 && preg_match('/^[A-Za-z_][A-Za-z0-9_-]*:/u', $trimmed) && $trimmed !== 'lines:') break;
        if ($trimmed === '') continue;

        if (preg_match('/^(\s*)-\s+text:\s*(.*)$/u', $rawLine, $match)) {
            $itemIndent = strlen($match[1]);
            if ($lineIndent !== null && $itemIndent > $lineIndent && $lineIndex !== null) {
                $result[$lineIndex]['_words'][] = ['text' => karaoke_lyricsfile_scalar($match[2])];
                $wordIndex = count($result[$lineIndex]['_words']) - 1;
            } else {
                $lineIndent = $lineIndent ?? $itemIndent;
                $wordsIndent = null;
                $wordIndex = null;
                $result[] = [
                    'text' => karaoke_lyricsfile_scalar($match[2]),
                    '_words' => []
                ];
                $lineIndex = count($result) - 1;
            }
            continue;
        }

        if ($lineIndex === null) continue;
        if (preg_match('/^(\s*)words:\s*$/u', $rawLine, $match)) {
            $wordsIndent = strlen($match[1]);
            $wordIndex = null;
            continue;
        }

        if (preg_match('/^(\s*)(start_ms|end_ms):\s*([0-9]+(?:\.[0-9]+)?)/u', $rawLine, $match)) {
            $fieldIndent = strlen($match[1]);
            $field = $match[2] === 'start_ms' ? 'start' : 'end';
            $seconds = (float)$match[3] / 1000;
            if ($wordsIndent !== null && $wordIndex !== null && $fieldIndent > $wordsIndent) {
                $result[$lineIndex]['_words'][$wordIndex][$field] = $seconds;
            } elseif ($fieldIndent <= ($lineIndent + 2)) {
                $result[$lineIndex][$field] = $seconds;
            }
        }
    }

    foreach ($result as &$cue) {
        $wordTimings = [];
        foreach ($cue['_words'] as $word) {
            if (!isset($word['start']) || !is_numeric($word['start'])) continue;
            $timing = ['text' => (string)($word['text'] ?? ''), 'start' => (float)$word['start']];
            if (isset($word['end']) && is_numeric($word['end'])) $timing['end'] = (float)$word['end'];
            $wordTimings[] = $timing;
        }
        if (!isset($cue['start']) && $wordTimings) $cue['start'] = $wordTimings[0]['start'];
        if ($wordTimings) $cue['wordTimings'] = $wordTimings;
        unset($cue['_words']);
    }
    unset($cue);

    return array_values(array_filter($result, static fn(array $cue): bool => isset($cue['start']) && trim((string)($cue['text'] ?? '')) !== ''));
}

function karaoke_attach_word_timings(array $matched, array $timedLines): array
{
    foreach ($matched as &$cue) {
        $best = null;
        $bestScore = INF;
        foreach ($timedLines as $timedLine) {
            if (empty($timedLine['wordTimings']) || !is_array($timedLine['wordTimings'])) continue;
            $left = karaoke_normalize_lyric_text((string)($cue['text'] ?? ''));
            $right = karaoke_normalize_lyric_text((string)($timedLine['text'] ?? ''));
            if ($left === '' || $right === '') continue;
            similar_text($left, $right, $percent);
            if ($left !== $right && $percent < 86) continue;
            $score = abs((float)($cue['start'] ?? 0) - (float)($timedLine['start'] ?? 0));
            if ($left !== $right) $score += (100 - $percent) / 100;
            if ($score < $bestScore) {
                $best = $timedLine;
                $bestScore = $score;
            }
        }

        if ($best === null) continue;
        $visibleWords = preg_split('/\s+/u', trim((string)($cue['text'] ?? '')), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (count($visibleWords) !== count($best['wordTimings'])) continue;
        $sameWords = true;
        foreach ($visibleWords as $index => $visibleWord) {
            if (karaoke_normalize_lyric_text($visibleWord) !== karaoke_normalize_lyric_text((string)($best['wordTimings'][$index]['text'] ?? ''))) {
                $sameWords = false;
                break;
            }
        }
        if (!$sameWords) continue;
        $cue['wordTimings'] = $best['wordTimings'];
        $cue['start'] = (float)$best['start'];
        if (isset($best['end'])) $cue['end'] = (float)$best['end'];
    }
    unset($cue);
    return $matched;
}

function karaoke_match_pasted_lines(array $provided, array $timed): ?array
{
    $matched = [];
    $cursor = 0;
    foreach ($provided as $line) {
        $found = false;
        for ($index = $cursor; $index < min(count($timed), $cursor + 8); $index++) {
            $left = karaoke_normalize_lyric_text($line);
            $right = karaoke_normalize_lyric_text((string)$timed[$index]['text']);
            if ($left === '' || $right === '') continue;
            if ($left !== $right) {
                similar_text($left, $right, $percent);
                if ($percent < 86) continue;
            }
            $matched[] = ['start' => round((float)$timed[$index]['start'], 2), 'text' => $line];
            $cursor = $index + 1;
            $found = true;
            break;
        }
        if (!$found) return null;
    }
    return $matched;
}

function karaoke_fetch_timed_lyric_records(string $title, string $artist): array
{
    $url = 'https://lrclib.net/api/search?' . http_build_query([
        'track_name' => $title,
        'artist_name' => $artist
    ], '', '&', PHP_QUERY_RFC3986);
    $body = false;

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl !== false) {
            curl_setopt_array($curl, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 4,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_USERAGENT => 'Karaokur/1.0 (http://localhost/wst2-karaoke/)',
                CURLOPT_HTTPHEADER => ['Accept: application/json']
            ]);
            $response = curl_exec($curl);
            $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            curl_close($curl);
            if ($status === 200 && is_string($response) && strlen($response) <= 2_000_000) $body = $response;
        }
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create(['http' => [
            'timeout' => 4,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nUser-Agent: Karaokur/1.0 (http://localhost/wst2-karaoke/)\r\n"
        ]]);
        $response = @file_get_contents($url, false, $context);
        $status = 0;
        foreach ($http_response_header ?? [] as $headerLine) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $headerLine, $match)) $status = (int)$match[1];
        }
        if ($status === 200 && is_string($response) && strlen($response) <= 2_000_000) $body = $response;
    }

    if (!is_string($body)) return [];
    $records = json_decode($body, true);
    return is_array($records) ? $records : [];
}

function karaoke_lookup_upload_lyrics(string $title, string $artist, string $pastedLyrics = ''): array
{
    $titleKey = karaoke_normalize_lyric_text($title);
    $artistKey = karaoke_normalize_lyric_text($artist);
    $provided = array_values(array_filter(array_map('trim', preg_split('/\R/u', $pastedLyrics) ?: []),
        static fn(string $line): bool => $line !== '' && preg_match('/^\[[^\]]+\]$/u', $line) !== 1));

    foreach (karaoke_fetch_timed_lyric_records($title, $artist) as $record) {
        if (!is_array($record)) continue;
        if (karaoke_normalize_lyric_text((string)($record['trackName'] ?? '')) !== $titleKey) continue;
        if (karaoke_normalize_lyric_text((string)($record['artistName'] ?? '')) !== $artistKey) continue;

        $lyricsfileCues = karaoke_parse_lyricsfile_cues((string)($record['lyricsfile'] ?? ''));
        $timed = karaoke_parse_timed_lyrics((string)($record['syncedLyrics'] ?? ''));
        if (!$timed) $timed = $lyricsfileCues;
        if (!$timed) continue;

        $cues = $provided ? karaoke_match_pasted_lines($provided, $timed) : null;
        $cues = $cues ?? ($lyricsfileCues ?: $timed);
        if ($lyricsfileCues) $cues = karaoke_attach_word_timings($cues, $lyricsfileCues);
        return [
            'cues' => $cues,
            'duration' => is_numeric($record['duration'] ?? null) ? (float)$record['duration'] : null,
            'source' => 'lrclib'
        ];
    }

    return ['cues' => [], 'duration' => null, 'source' => null];
}
