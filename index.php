<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#1b120d">
    <title>Karaokur</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="page-noise" aria-hidden="true"></div>

<header class="site-header">
    <h1>KARAOKUR</h1>
    <button
        type="button"
        class="settings-mode-button site-mode-toggle"
        id="controlModeToggle"
        aria-pressed="false"
        aria-controls="sliderSettings hardwareSettings cdPlayer">
        TV Knobs
    </button>
</header>

<main class="app-shell">
    <section class="tv-stage" aria-label="Karaoke player">
        <div class="tv-set">
            <div class="screen-bezel">
            <div class="crt-screen" id="crtScreen">
                    <div class="scanlines" aria-hidden="true"></div>

                    <div class="idle-screen" id="idleScreen">
                        <canvas class="static-layer" id="staticLayer" width="640" height="360" aria-hidden="true"></canvas>
                        <div class="static-roll" aria-hidden="true"></div>
                        <div class="idle-content">
                            <span class="status-dot"></span>
                            <p>CHANNEL 01</p>
                            <h2>KARAOKUR</h2>
                            <p class="small">READY — CHOOSE A SONG</p>
                        </div>
                    </div>

                    <video id="localPlayer" playsinline preload="metadata" hidden></video>

                    <iframe
                        id="youtubePlayer"
                        title="YouTube karaoke player"
                        hidden
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>

                    <div class="playback-controls hidden" id="playbackControls" role="group" aria-label="Video playback controls">
                        <div class="playback-timeline">
                            <output class="playback-time" id="playbackTime">0:00 / 0:00</output>
                            <input
                                class="playback-seek"
                                type="range"
                                id="playbackSeek"
                                min="0"
                                max="1000"
                                step="1"
                                value="0"
                                aria-label="Video position"
                                aria-valuetext="0:00 of 0:00"
                                disabled>
                        </div>
                        <div class="playback-transport">
                            <button type="button" class="playback-action" id="rewindButton" aria-label="Back 10 seconds" title="Back 10 seconds" aria-controls="crtScreen" disabled>
                                <svg class="playback-icon skip-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M14.4 4.4a8 8 0 1 1-7.9 2.1M6.4 3.5v4.6H2" />
                                    <text class="skip-mark" x="12" y="15.2" text-anchor="middle">10</text>
                                </svg>
                            </button>
                            <button type="button" class="playback-action playback-toggle" id="playPauseButton" aria-label="Play video" title="Play video" aria-controls="crtScreen" disabled>
                                <svg class="playback-icon" id="playIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path class="icon-solid" d="M8 5.5v13l10-6.5-10-6.5Z" />
                                </svg>
                                <svg class="playback-icon" id="pauseIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" hidden>
                                    <path d="M8 6v12M16 6v12" />
                                </svg>
                            </button>
                            <button type="button" class="playback-action" id="forwardButton" aria-label="Forward 10 seconds" title="Forward 10 seconds" aria-controls="crtScreen" disabled>
                                <svg class="playback-icon skip-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M9.6 4.4a8 8 0 1 0 7.9 2.1M17.6 3.5v4.6H22" />
                                    <text class="skip-mark" x="12" y="15.2" text-anchor="middle">10</text>
                                </svg>
                            </button>
                            <label class="playback-speed" for="playbackSpeed">
                                <span>Speed</span>
                                <select id="playbackSpeed" aria-label="Playback speed" disabled>
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                            </label>
                            <button type="button" class="playback-action playback-fullscreen" id="fullscreenButton" aria-label="Maximize video" title="Maximize video" aria-controls="crtScreen" aria-pressed="false">
                                <svg class="playback-icon" id="fullscreenIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="M8.5 4.5h-4v4M15.5 4.5h4v4M4.5 15.5v4h4M19.5 15.5v4h-4" />
                                </svg>
                                <svg class="playback-icon" id="exitFullscreenIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" hidden>
                                    <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M9 20v-5H4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <div class="current-song-card">
            <span>NOW PLAYING</span>
            <strong id="currentSong">No song selected</strong>
        </div>
    </section>

    <section class="control-panel" id="controlPanel" aria-label="Song source controls">
        <div class="panel-heading">
            <h2>Choose your karaoke source</h2>
        </div>

        <div class="source-tabs" role="tablist" aria-label="Karaoke source">
            <button
                type="button"
                class="source-tab active"
                id="uploadTab"
                role="tab"
                aria-selected="true"
                aria-controls="uploadPanel">
                Upload Video
            </button>

            <button
                type="button"
                class="source-tab"
                id="youtubeTab"
                role="tab"
                aria-selected="false"
                aria-controls="youtubePanel">
                YouTube Link
            </button>
        </div>

        <div class="cd-player hidden" id="cdPlayer" aria-live="polite">
            <div class="cd-disc-well" aria-hidden="true">
                <div class="cd-disc" id="cdDisc"><span></span></div>
            </div>
            <div class="cd-display">
                <span class="cd-player-brand">KARAOKUR DISC DECK</span>
                <strong id="cdTrackTitle">NO DISC LOADED</strong>
                <div class="cd-state">
                    <span class="cd-led"></span>
                    <span id="cdStatus">READY TO LOAD</span>
                </div>
            </div>
        </div>

        <section id="uploadPanel" class="source-panel" role="tabpanel" aria-labelledby="uploadTab">
            <form id="uploadForm" enctype="multipart/form-data">
                <label class="drop-zone" for="videoFile" id="dropZone">
                    <span class="drop-icon">▲</span>
                    <strong>Choose a karaoke video</strong>
                    <span>MP4, WebM, or OGG • Maximum 500 MB</span>
                    <span class="file-name" id="selectedFile">No file selected</span>
                </label>

                <input
                    type="file"
                    id="videoFile"
                    name="video"
                    accept=".mp4,.webm,.ogg,video/mp4,video/webm,video/ogg"
                    hidden>

                <button class="primary-btn" id="uploadButton" type="submit">
                    Load Video
                </button>
            </form>
        </section>

        <section id="youtubePanel" class="source-panel hidden" role="tabpanel" aria-labelledby="youtubeTab">
            <form id="youtubeForm">
                <label class="field-label" for="youtubeUrl">YouTube URL</label>

                <input
                    type="url"
                    id="youtubeUrl"
                    name="url"
                    inputmode="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    autocomplete="off">

                <button class="primary-btn" id="youtubeButton" type="submit">
                    Load YouTube Video
                </button>
            </form>
        </section>

        <div class="message" id="message" role="status" aria-live="polite"></div>

        <div class="player-actions">
            <button type="button" class="secondary-btn" id="stopButton">Stop / Clear</button>
        </div>

        <section class="audio-settings" aria-labelledby="settingsTitle">
            <div class="settings-heading">
                <div>
                    <h2 id="settingsTitle">Settings</h2>
                </div>
                <div class="settings-actions">
                    <button type="button" class="mic-btn" id="micButton">Enable Mic</button>
                </div>
            </div>

            <div class="slider-settings" id="sliderSettings">
                <label class="range-setting" for="micVolume">
                    <span>Microphone volume <output id="micVolumeValue">100%</output></span>
                    <input type="range" id="micVolume" min="0" max="200" value="100">
                </label>

                <label class="range-setting" for="micEcho">
                    <span>Microphone echo <output id="micEchoValue">0%</output></span>
                    <input type="range" id="micEcho" min="0" max="100" value="0">
                </label>

                <label class="range-setting" for="videoVolume">
                    <span>Video volume <output id="videoVolumeValue">80%</output></span>
                    <input type="range" id="videoVolume" min="0" max="100" value="80">
                </label>
            </div>

            <div class="hardware-settings hidden" id="hardwareSettings" aria-label="TV sound knobs">
                <div class="knob-bank">
                    <div
                        class="knob-control"
                        data-knob="micVolume"
                        data-value="micKnobValue"
                        role="slider"
                        tabindex="0"
                        aria-label="Microphone volume"
                        aria-valuemin="0"
                        aria-valuemax="200"
                        aria-valuenow="100"
                        aria-valuetext="100%"
                        aria-describedby="knobHelp">
                        <span class="knob-dial" aria-hidden="true"><span class="knob-pointer"></span></span>
                        <span class="knob-label">MIC VOLUME</span>
                        <output id="micKnobValue">100%</output>
                    </div>
                    <div
                        class="knob-control"
                        data-knob="micEcho"
                        data-value="echoKnobValue"
                        role="slider"
                        tabindex="0"
                        aria-label="Microphone echo"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="0"
                        aria-valuetext="0%"
                        aria-describedby="knobHelp">
                        <span class="knob-dial" aria-hidden="true"><span class="knob-pointer"></span></span>
                        <span class="knob-label">MIC ECHO</span>
                        <output id="echoKnobValue">0%</output>
                    </div>
                    <div
                        class="knob-control"
                        data-knob="videoVolume"
                        data-value="videoKnobValue"
                        role="slider"
                        tabindex="0"
                        aria-label="Video volume"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="80"
                        aria-valuetext="80%"
                        aria-describedby="knobHelp">
                        <span class="knob-dial" aria-hidden="true"><span class="knob-pointer"></span></span>
                        <span class="knob-label">VIDEO VOLUME</span>
                        <output id="videoKnobValue">80%</output>
                    </div>
                </div>
                <p class="knob-help" id="knobHelp">Use ↑ or → to raise a knob, ↓ or ← to lower it, and Tab to move between knobs.</p>
            </div>

            <p class="mic-status" id="micStatus">Microphone is off. Use headphones to prevent feedback.</p>
        </section>
    </section>
</main>

<footer class="site-footer">
    <span>KARAOKUR</span>
    <span>PHP • HTML • CSS • JAVASCRIPT</span>
</footer>

<script src="script.js"></script>
</body>
</html>
