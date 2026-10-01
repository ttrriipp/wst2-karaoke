<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#1b120d">
    <title>Karaokur TV Display</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="tv-display-page">
<div class="page-noise" aria-hidden="true"></div>

<main class="tv-display-shell" id="tvDisplayShell">
    <header class="tv-now-playing">
        <span>NOW PLAYING</span>
        <h1 id="tvSongTitle">Waiting for a song…</h1>
    </header>

    <section class="tv-video-surface" aria-label="Karaoke TV display">
        <div class="scanlines" aria-hidden="true"></div>
        <div class="tv-display-idle" id="tvIdle">
            <span class="status-dot"></span>
            <p>CHANNEL 01</p>
            <h2>KARAOKUR</h2>
            <p>READY — CHOOSE A SONG ON THE CONTROLLER</p>
        </div>
        <video id="tvLocalPlayer" playsinline preload="metadata" hidden></video>
        <iframe
            id="tvYoutubePlayer"
            title="YouTube karaoke TV player"
            hidden
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen>
        </iframe>
    </section>
</main>

<script src="tv.js"></script>
</body>
</html>
