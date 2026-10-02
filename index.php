<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#1b120d">
    <link rel="preconnect" href="https://videos.pexels.com">
    <title>Karaokur</title>
    <link rel="stylesheet" href="style.css?v=20261002-line-lyrics">
</head>
<body>
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
                            <div class="idle-state">
                                <span class="status-dot" aria-hidden="true"></span>
                                <span>Ready to sing</span>
                            </div>
                            <h2>The stage is yours</h2>
                            <p class="small">Choose a song in the library to begin.</p>
                        </div>
                    </div>

                    <audio id="localPlayer" preload="metadata" hidden></audio>

                    <iframe
                        id="youtubePlayer"
                        title="YouTube karaoke player"
                        hidden
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>

                    <video id="ambientFootage" class="ambient-footage" playsinline muted loop preload="none" aria-hidden="true" hidden></video>

                    <section class="synced-lyrics" id="syncedLyrics" aria-label="Synchronized lyrics" hidden>
                        <p class="synced-lyrics-current" id="currentLyric">Lyrics will appear when the song begins.</p>
                        <p class="synced-lyrics-next" id="nextLyric"></p>
                        <p class="synced-lyrics-note" id="lyricNote"></p>
                    </section>

                    <div class="playback-controls hidden" id="playbackControls" role="group" aria-label="Song playback controls">
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
                                aria-label="Song position"
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
                            <button type="button" class="playback-action playback-toggle" id="playPauseButton" aria-label="Play song" title="Play song" aria-controls="crtScreen" disabled>
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
                            <button type="button" class="playback-action playback-fullscreen" id="fullscreenButton" aria-label="Maximize karaoke player" title="Maximize karaoke player" aria-controls="crtScreen" aria-pressed="false">
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
            <button
                type="button"
                class="lyrics-visibility-toggle"
                id="lyricsVisibilityToggle"
                aria-controls="syncedLyrics"
                aria-label="Hide lyrics"
                aria-pressed="true"
                hidden>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                </svg>
                <span id="lyricsVisibilityLabel">Hide lyrics</span>
            </button>
            <details class="lyrics-sync-controls" id="lyricsSyncControls" hidden>
                <summary aria-label="Adjust lyric timing" title="Adjust lyric timing">Sync</summary>
                <div class="lyrics-sync-popover">
                    <label class="lyrics-sync-heading" for="lyricsSyncRange">
                        <span>Lyric timing</span>
                        <output id="lyricsSyncValue" for="lyricsSyncRange">0.00 s</output>
                    </label>
                    <input type="range" id="lyricsSyncRange" min="-30" max="30" step="0.25" value="0" aria-label="Move lyrics from earlier to later">
                    <div class="lyrics-sync-directions" aria-hidden="true">
                        <span>Earlier</span>
                        <span>Later</span>
                    </div>
                    <p>Adjusts the full song. It cannot correct a tempo mismatch.</p>
                    <button type="button" class="lyrics-sync-reset" id="lyricsSyncReset">Reset</button>
                </div>
            </details>
        </div>

        <details class="playback-queue" id="libraryQueue" hidden>
            <summary>
                <span>Queue</span>
                <span class="playback-queue-count" id="queueCount">0</span>
            </summary>
            <div class="playback-queue-content">
                <ol class="library-queue-list" id="queueList"></ol>
                <div class="playback-queue-clear">
                    <button type="button" class="library-clear-button" id="clearQueueButton">Clear queue</button>
                </div>
            </div>
        </details>
    </section>

    <section class="control-panel" id="controlPanel" aria-label="Song source controls">
        <div class="panel-heading">
            <h2>Pick a song or source</h2>
        </div>

        <div class="source-tabs" role="tablist" aria-label="Karaoke source">
            <button
                type="button"
                class="source-tab active"
                id="libraryTab"
                role="tab"
                aria-selected="true"
                aria-controls="libraryPanel">
                Library
            </button>

            <button
                type="button"
                class="source-tab"
                id="uploadTab"
                role="tab"
                aria-selected="false"
                aria-controls="uploadPanel">
                Add Song
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

        <section id="libraryPanel" class="source-panel" role="tabpanel" aria-labelledby="libraryTab" tabindex="0">
            <div class="library-toolbar">
                <label class="library-search-wrap" for="librarySearch">
                    <input type="search" id="librarySearch" aria-label="Search songs" placeholder="Search title or artist" autocomplete="off">
                </label>
                <button type="button" class="library-filter-button" id="favoritesFilter" aria-pressed="false">Favorites</button>
            </div>

            <div class="library-results">
                <span id="libraryCount" aria-live="polite">Loading library</span>
            </div>

            <div class="library-list" id="libraryList" aria-label="Song list">
                <p class="library-empty">Loading songs…</p>
            </div>

        </section>

        <section id="uploadPanel" class="source-panel hidden" role="tabpanel" aria-labelledby="uploadTab" tabindex="0">
            <form id="uploadForm" enctype="multipart/form-data">
                <fieldset class="add-source-choice">
                    <legend>Add from</legend>
                    <label><input type="radio" name="songSource" value="youtube" checked> YouTube link</label>
                    <label><input type="radio" name="songSource" value="file"> Audio or video file</label>
                </fieldset>

                <div class="youtube-song-fields" id="youtubeSongFields">
                    <label class="song-library-field" for="youtubeUrl">
                        <span>YouTube link</span>
                        <input type="url" id="youtubeUrl" name="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=..." autocomplete="off" required>
                    </label>
                    <label class="song-library-field" for="songLyrics">
                        <span>Lyrics <small>(optional — searched by song details)</small></span>
                        <textarea id="songLyrics" name="lyrics" rows="8" maxlength="10000" placeholder="Leave blank to find timed lyrics automatically, or paste the words here"></textarea>
                    </label>
                    <p class="add-song-help">Lyrics are optional. If no timed match is found, the song is still added and can play without on-screen lyrics.</p>
                    <div class="youtube-search-tools">
                        <p class="youtube-search-help">Search by song title. Adding the artist or a lyric phrase can improve the results.</p>
                        <button class="secondary-btn youtube-search-button" id="findInstrumentalButton" type="button">Find an instrumental</button>
                    </div>
                    <section class="youtube-search-results hidden" id="youtubeSearchResults" aria-label="YouTube search results">
                        <p class="youtube-search-status" id="youtubeSearchStatus" role="status" aria-live="polite"></p>
                        <div class="youtube-search-result-list" id="youtubeSearchResultList"></div>
                    </section>
                </div>

                <div class="file-song-fields hidden" id="fileSongFields">
                    <label class="drop-zone" for="videoFile" id="dropZone">
                        <span class="drop-icon">▲</span>
                        <strong>Choose audio or video</strong>
                        <span>MP4, WebM, OGG, MP3, WAV, or M4A • Maximum 500 MB • Only the audio will play</span>
                        <span class="file-name" id="selectedFile">No file selected</span>
                    </label>
                    <input
                        type="file"
                        id="videoFile"
                        name="video"
                        accept=".mp4,.webm,.ogg,.mp3,.wav,.m4a,video/mp4,video/webm,video/ogg,audio/ogg,audio/mpeg,audio/wav,audio/mp4"
                        hidden>
                    <label class="song-library-field file-lyrics-field" for="fileSongLyrics">
                        <span>Lyrics <small>(optional)</small></span>
                        <textarea id="fileSongLyrics" name="fileLyrics" rows="5" maxlength="10000" placeholder="Paste the words here, one sung line per line"></textarea>
                    </label>
                    <p class="add-song-help file-lyrics-help">Lyrics are optional. If no timed match is found, the song is still added and can play without on-screen lyrics. Uploaded video pictures are ignored; the player uses calming footage instead.</p>
                </div>

                <details class="song-details" id="songDetails">
                    <summary id="songDetailsSummary">Song details (optional for a pasted link)</summary>
                    <div class="song-library-fields">
                        <label class="song-library-field" for="songTitle">
                            <span>Song title</span>
                            <input type="text" id="songTitle" name="title" maxlength="120" autocomplete="off" placeholder="Enter the song title">
                        </label>
                        <label class="song-library-field" for="songArtist">
                            <span>Artist</span>
                            <input type="text" id="songArtist" name="artist" maxlength="120" autocomplete="off" placeholder="Enter the artist (optional for YouTube)">
                        </label>
                    </div>
                </details>

                <div class="upload-actions">
                    <button class="primary-btn" id="uploadButton" type="submit">
                        Add to Song Library
                    </button>
                </div>
            </form>
        </section>

        <div class="message" id="message" role="status" aria-live="polite"></div>

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
                    <span>Music volume <output id="videoVolumeValue">80%</output></span>
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
                        aria-label="Music volume"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="80"
                        aria-valuetext="80%"
                        aria-describedby="knobHelp">
                        <span class="knob-dial" aria-hidden="true"><span class="knob-pointer"></span></span>
                        <span class="knob-label">MUSIC VOLUME</span>
                        <output id="videoKnobValue">80%</output>
                    </div>
                </div>
                <p class="knob-help" id="knobHelp">Use ↑ or → to raise a knob, ↓ or ← to lower it, and Tab to move between knobs.</p>
            </div>

            <p class="mic-status" id="micStatus">Microphone is off. Use headphones to prevent feedback.</p>
        </section>
    </section>
</main>

<dialog class="confirm-dialog" id="removeSongDialog" aria-labelledby="removeSongDialogTitle" aria-describedby="removeSongDialogDescription">
    <div class="confirm-dialog-card">
        <p class="confirm-dialog-kicker">Song library</p>
        <h2 id="removeSongDialogTitle">Remove this song?</h2>
        <p class="confirm-dialog-song" id="removeSongDialogName"></p>
        <p class="confirm-dialog-description" id="removeSongDialogDescription">This song will be removed from your library.</p>
        <p class="confirm-dialog-file-note" id="removeSongDialogFileNote" hidden>The uploaded media file will also be deleted.</p>
        <div class="confirm-dialog-actions">
            <button class="confirm-dialog-button confirm-dialog-cancel" id="cancelRemoveSong" type="button">Cancel</button>
            <button class="confirm-dialog-button confirm-dialog-remove" id="confirmRemoveSong" type="button">Remove song</button>
        </div>
    </div>
</dialog>

<script src="lyric_display.js?v=20261002-line-lyrics"></script>
<script src="script.js?v=20261002-line-lyrics"></script>
</body>
</html>
