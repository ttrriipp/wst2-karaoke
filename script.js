(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const uploadTab = $("uploadTab");
    const youtubeTab = $("youtubeTab");
    const uploadPanel = $("uploadPanel");
    const youtubePanel = $("youtubePanel");
    const uploadForm = $("uploadForm");
    const youtubeForm = $("youtubeForm");
    const videoFile = $("videoFile");
    const selectedFile = $("selectedFile");
    const dropZone = $("dropZone");
    const youtubeUrl = $("youtubeUrl");
    const uploadButton = $("uploadButton");
    const youtubeButton = $("youtubeButton");
    const stopButton = $("stopButton");
    const currentSong = $("currentSong");
    const message = $("message");
    const idleScreen = $("idleScreen");
    const staticLayer = $("staticLayer");
    const staticContext = staticLayer?.getContext("2d", { alpha: false });
    const crtScreen = $("crtScreen");
    const localPlayer = $("localPlayer");
    const youtubePlayer = $("youtubePlayer");
    const playbackControls = $("playbackControls");
    const playbackTime = $("playbackTime");
    const playbackSeek = $("playbackSeek");
    const rewindButton = $("rewindButton");
    const playPauseButton = $("playPauseButton");
    const forwardButton = $("forwardButton");
    const playIcon = $("playIcon");
    const pauseIcon = $("pauseIcon");
    const playbackSpeed = $("playbackSpeed");
    const fullscreenButton = $("fullscreenButton");
    const fullscreenIcon = $("fullscreenIcon");
    const exitFullscreenIcon = $("exitFullscreenIcon");
    const micButton = $("micButton");
    const micStatus = $("micStatus");
    const micVolume = $("micVolume");
    const micVolumeValue = $("micVolumeValue");
    const micEcho = $("micEcho");
    const micEchoValue = $("micEchoValue");
    const videoVolume = $("videoVolume");
    const videoVolumeValue = $("videoVolumeValue");
    const controlPanel = $("controlPanel");
    const controlModeToggle = $("controlModeToggle");
    const sliderSettings = $("sliderSettings");
    const hardwareSettings = $("hardwareSettings");
    const knobControls = Array.from(document.querySelectorAll(".knob-control"));
    const cdPlayer = $("cdPlayer");
    const cdDisc = $("cdDisc");
    const cdTrackTitle = $("cdTrackTitle");
    const cdStatus = $("cdStatus");

    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/ogg"];
    const ALLOWED_EXTENSIONS = ["mp4", "webm", "ogg"];
    const STORAGE_KEY = "karaokur-display-state-v1";
    const CONTROL_MODE_KEY = "karaokur-control-mode-v1";
    const CHANNEL_NAME = "karaokur-tv-channel-v1";
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    let microphone = null;
    let lastProgressSent = 0;
    let controlMode = "sliders";
    let cdDeckOverride = null;
    let youtubeApiPlayer = null;
    let youtubeApiPromise = null;
    let youtubeProgressTimer = null;
    let playbackRequestId = 0;
    let supportedYoutubeRates = [1];
    let staticFrame = null;
    let staticTimer = null;
    const reduceStaticMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let state = {
        source: null,
        cleared: true,
        playback: { action: "pause", currentTime: 0, updatedAt: Date.now() },
        settings: { micVolume: 100, micEcho: 0, videoVolume: 80 }
    };

    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved && typeof saved === "object") {
            state = { ...state, ...saved, settings: { ...state.settings, ...(saved.settings || {}) } };
        }
        if (localStorage.getItem(CONTROL_MODE_KEY) === "hardware") controlMode = "hardware";
    } catch (_) {}

    function drawStaticFrame() {
        if (!staticContext) return;
        staticFrame ??= staticContext.createImageData(staticLayer.width, staticLayer.height);
        const pixels = staticFrame.data;

        for (let index = 0; index < pixels.length; index += 4) {
            const noise = Math.random();
            const value = noise > .985 ? 255 : noise < .015 ? 0 : 22 + Math.floor(noise * 205);
            pixels[index] = value;
            pixels[index + 1] = Math.round(value * .87);
            pixels[index + 2] = Math.round(value * .7);
            pixels[index + 3] = 255;
        }

        staticContext.putImageData(staticFrame, 0, 0);
    }

    function startStaticAnimation() {
        drawStaticFrame();
        if (reduceStaticMotion || staticTimer) return;
        staticTimer = window.setInterval(() => {
            if (!document.hidden) drawStaticFrame();
        }, 110);
    }

    function stopStaticAnimation() {
        if (staticTimer) window.clearInterval(staticTimer);
        staticTimer = null;
    }

    startStaticAnimation();

    function updateCdDeck() {
        const source = state.source && !state.cleared ? state.source : null;
        const selectedFile = videoFile.files[0];
        const selectedTitle = selectedFile
            ? selectedFile.name.replace(/\.[^.]+$/, "") || "Uploaded karaoke video"
            : "NO DISC LOADED";
        const title = cdDeckOverride?.title ?? source?.title ?? selectedTitle;
        const status = cdDeckOverride?.status ?? (
            source
                ? state.playback.action === "play" ? "PLAYING VIDEO" : "PAUSED"
                : selectedFile ? "DISC READY" : "READY TO LOAD"
        );
        const isLoading = status === "LOADING VIDEO" || status === "CHECKING LINK";
        const isPlaying = status === "PLAYING VIDEO";

        cdTrackTitle.textContent = title || "NO DISC LOADED";
        cdStatus.textContent = status;
        cdPlayer.classList.toggle("is-loading", isLoading);
        cdPlayer.classList.toggle("is-playing", isPlaying);
        cdDisc.classList.toggle("spinning", isLoading || isPlaying);
    }

    function setCdDeckOverride(status, title) {
        cdDeckOverride = { status, title };
        updateCdDeck();
    }

    function clearCdDeckOverride() {
        cdDeckOverride = null;
        updateCdDeck();
    }

    function setTab(type) {
        const uploadActive = type === "upload";
        uploadTab.classList.toggle("active", uploadActive);
        youtubeTab.classList.toggle("active", !uploadActive);
        uploadTab.setAttribute("aria-selected", String(uploadActive));
        youtubeTab.setAttribute("aria-selected", String(!uploadActive));
        uploadPanel.classList.toggle("hidden", !uploadActive);
        youtubePanel.classList.toggle("hidden", uploadActive);
        clearMessage();
    }

    uploadTab.addEventListener("click", () => setTab("upload"));
    youtubeTab.addEventListener("click", () => setTab("youtube"));

    function publishState() {
        state.sentAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        channel?.postMessage({ type: "state", state });
        updateCdDeck();
    }

    function updatePlayback(action, currentTime = 0) {
        state.playback = { action, currentTime: Number(currentTime) || 0, updatedAt: Date.now() };
        publishState();
    }

    function getExtension(name) {
        const parts = name.toLowerCase().split(".");
        return parts.length > 1 ? parts.pop() : "";
    }

    function validateFile(file) {
        if (!file) return "Please choose a video first.";
        const extension = getExtension(file.name);
        if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
            return "Only MP4, WebM, and OGG video files are allowed.";
        }
        if (file.size > MAX_FILE_SIZE) return "The video is larger than 500 MB.";
        return "";
    }

    function getUploadTitle(file) {
        return file.name.replace(/\.[^.]+$/, "") || "Uploaded karaoke video";
    }

    videoFile.addEventListener("change", () => {
        const file = videoFile.files[0];
        selectedFile.textContent = file ? file.name : "No file selected";
        const error = validateFile(file);
        if (file && error) {
            showMessage(error, "error");
            setCdDeckOverride("INVALID VIDEO", file.name);
        } else {
            clearMessage();
            if (file) setCdDeckOverride("DISC SELECTED", getUploadTitle(file));
            else clearCdDeckOverride();
        }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("drag-over");
        });
    });

    dropZone.addEventListener("drop", (event) => {
        const files = event.dataTransfer.files;
        if (!files.length) return;
        const transfer = new DataTransfer();
        transfer.items.add(files[0]);
        videoFile.files = transfer.files;
        videoFile.dispatchEvent(new Event("change"));
    });

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const file = videoFile.files[0];
        const validationError = validateFile(file);
        if (validationError) {
            showMessage(validationError, "error");
            return;
        }

        const formData = new FormData();
        formData.append("video", file);
        setBusy(uploadButton, true, "Uploading...");
        showMessage("Uploading and checking your video...", "success");
        setCdDeckOverride("LOADING VIDEO", getUploadTitle(file));

        try {
            const response = await fetch("upload.php", { method: "POST", body: formData });
            const result = await parseJsonResponse(response);
            if (!response.ok || !result.success) throw new Error(result.message || "The upload failed.");
            playLocalVideo(result.file, getUploadTitle(file));
            showMessage("Video loaded successfully.", "success");
        } catch (error) {
            showMessage(error.message || "The upload failed.", "error");
        } finally {
            clearCdDeckOverride();
            setBusy(uploadButton, false, controlMode === "hardware" ? "Load Disc" : "Load Video");
        }
    });

    youtubeForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const url = youtubeUrl.value.trim();
        if (!url) {
            showMessage("Paste a YouTube link first.", "error");
            return;
        }

        setBusy(youtubeButton, true, "Checking...");
        showMessage("Validating YouTube link...", "success");
        setCdDeckOverride("CHECKING LINK", "YOUTUBE STREAM");
        try {
            const body = new URLSearchParams();
            body.set("url", url);
            const response = await fetch("validate_youtube.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: body.toString()
            });
            const result = await parseJsonResponse(response);
            if (!response.ok || !result.success) throw new Error(result.message || "Invalid YouTube link.");
            playYouTubeVideo(result.videoId, `YouTube karaoke • ${result.videoId}`);
            fetchYouTubeTitle(result.videoId);
            showMessage("YouTube video loaded successfully.", "success");
        } catch (error) {
            showMessage(error.message || "Invalid YouTube link.", "error");
        } finally {
            clearCdDeckOverride();
            setBusy(youtubeButton, false, controlMode === "hardware" ? "Load Stream" : "Load YouTube Video");
        }
    });

    function loadYouTubeIframeApi() {
        if (window.YT?.Player) return Promise.resolve(window.YT);
        if (youtubeApiPromise) return youtubeApiPromise;

        youtubeApiPromise = new Promise((resolve, reject) => {
            let settled = false;
            let apiTimeout = null;
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(apiTimeout);
                try { previousReady?.(); } catch (_) {}
                resolve(window.YT);
            };

            apiTimeout = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                youtubeApiPromise = null;
                reject(new Error("YouTube playback controls could not connect."));
            }, 15000);

            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(apiTimeout);
                youtubeApiPromise = null;
                reject(new Error("YouTube playback controls could not connect."));
            };
            document.head.appendChild(script);
        });

        return youtubeApiPromise;
    }

    function youtubeEmbedUrl(videoId, showNativeControls = false) {
        const origin = encodeURIComponent(window.location.origin);
        const controls = showNativeControls ? 1 : 0;
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=${controls}&playsinline=1&rel=0&enablejsapi=1&origin=${origin}`;
    }

    function sendYoutubeCommand(command, args = []) {
        if (youtubeApiPlayer && typeof youtubeApiPlayer[command] === "function") {
            youtubeApiPlayer[command](...args);
            return;
        }

        youtubePlayer.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: command, args }),
            "https://www.youtube-nocookie.com"
        );
    }

    function formatPlaybackTime(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const minutes = Math.floor(total / 60);
        const remainder = String(total % 60).padStart(2, "0");
        if (minutes >= 60) {
            return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${remainder}`;
        }
        return `${minutes}:${remainder}`;
    }

    function getPlaybackDetails() {
        if (state.source?.type === "youtube" && youtubeApiPlayer) {
            try {
                const playerState = youtubeApiPlayer.getPlayerState();
                return {
                    currentTime: youtubeApiPlayer.getCurrentTime() || 0,
                    duration: youtubeApiPlayer.getDuration() || 0,
                    isPlaying: playerState === window.YT.PlayerState.PLAYING || playerState === window.YT.PlayerState.BUFFERING
                };
            } catch (_) {}
        }

        return {
            currentTime: localPlayer.currentTime || 0,
            duration: Number.isFinite(localPlayer.duration) ? localPlayer.duration : 0,
            isPlaying: !localPlayer.paused
        };
    }

    function syncPlaybackSpeedOptions() {
        const isYouTube = state.source?.type === "youtube";
        const availableRates = isYouTube ? supportedYoutubeRates : [0.5, 0.75, 1, 1.25, 1.5, 2];

        Array.from(playbackSpeed.options).forEach((option) => {
            option.disabled = isYouTube && !availableRates.includes(Number(option.value));
        });

        if (playbackSpeed.selectedOptions[0]?.disabled) playbackSpeed.value = "1";
        playbackSpeed.disabled = !state.source || (isYouTube && availableRates.length <= 1);
    }

    function updatePlaybackControls(isPlayingOverride = null) {
        const hasSource = Boolean(state.source && !state.cleared);
        const canControl = hasSource && (state.source.type !== "youtube" || Boolean(youtubeApiPlayer));
        const details = getPlaybackDetails();
        const { currentTime, duration } = details;
        const isPlaying = typeof isPlayingOverride === "boolean" ? isPlayingOverride : details.isPlaying;
        const hasDuration = Number.isFinite(duration) && duration > 0;

        playbackControls.classList.toggle("hidden", !canControl);
        playPauseButton.disabled = !canControl;
        rewindButton.disabled = !canControl || !hasDuration;
        forwardButton.disabled = !canControl || !hasDuration;
        playbackSeek.disabled = !canControl || !hasDuration;
        syncPlaybackSpeedOptions();

        setPlaybackButtonState(isPlaying);
        playbackTime.textContent = `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`;
        playbackSeek.setAttribute("aria-valuetext", `${formatPlaybackTime(currentTime)} of ${formatPlaybackTime(duration)}`);

        if (hasDuration && document.activeElement !== playbackSeek) {
            playbackSeek.value = String(Math.round((currentTime / duration) * 1000));
        } else if (!hasDuration) {
            playbackSeek.value = "0";
        }

        return { currentTime, duration, isPlaying };
    }

    function setPlaybackButtonState(isPlaying) {
        playPauseButton.setAttribute("aria-label", isPlaying ? "Pause video" : "Play video");
        playPauseButton.title = isPlaying ? "Pause video" : "Play video";
        playIcon.toggleAttribute("hidden", isPlaying);
        pauseIcon.toggleAttribute("hidden", !isPlaying);
    }

    function updateFullscreenControl() {
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        const isFullscreen = fullscreenElement === crtScreen;
        const supportsFullscreen = Boolean(crtScreen.requestFullscreen || crtScreen.webkitRequestFullscreen);

        fullscreenButton.disabled = !supportsFullscreen;
        fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit full screen" : "Maximize video");
        fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
        fullscreenButton.title = isFullscreen ? "Exit full screen" : "Maximize video";
        fullscreenIcon.toggleAttribute("hidden", isFullscreen);
        exitFullscreenIcon.toggleAttribute("hidden", !isFullscreen);
    }

    function syncYouTubePlaybackRates(player = youtubeApiPlayer) {
        if (!player?.getAvailablePlaybackRates) return;
        try {
            const rates = player.getAvailablePlaybackRates();
            supportedYoutubeRates = Array.isArray(rates) && rates.length ? rates : [1];
            syncPlaybackSpeedOptions();
        } catch (_) {
            supportedYoutubeRates = [1];
            syncPlaybackSpeedOptions();
        }
    }

    function stopYouTubeProgressTimer() {
        if (youtubeProgressTimer) window.clearInterval(youtubeProgressTimer);
        youtubeProgressTimer = null;
    }

    function startYouTubeProgressTimer() {
        stopYouTubeProgressTimer();
        youtubeProgressTimer = window.setInterval(() => {
            if (state.source?.type !== "youtube" || state.cleared || !youtubeApiPlayer) {
                stopYouTubeProgressTimer();
                return;
            }

            const details = updatePlaybackControls();
            if (Date.now() - lastProgressSent > 3000) {
                lastProgressSent = Date.now();
                updatePlayback("play", details.currentTime);
            }
        }, 250);
    }

    function handleYouTubeStateChange(event) {
        if (state.source?.type !== "youtube" || state.cleared) return;

        const playerState = event.data;
        const playing = playerState === window.YT.PlayerState.PLAYING || playerState === window.YT.PlayerState.BUFFERING;
        const stopped = playerState === window.YT.PlayerState.PAUSED || playerState === window.YT.PlayerState.ENDED;
        const currentTime = event.target.getCurrentTime() || 0;
        updatePlaybackControls(playing ? true : stopped ? false : null);

        if (playing) {
            syncYouTubePlaybackRates(event.target);
            startYouTubeProgressTimer();
            updatePlayback("play", currentTime);
        } else if (stopped) {
            stopYouTubeProgressTimer();
            updatePlayback("pause", currentTime);
            updatePlaybackControls();
        }
    }

    function handleYouTubePlaybackRateChange(event) {
        const rate = String(event.data);
        if (Array.from(playbackSpeed.options).some((option) => option.value === rate)) {
            playbackSpeed.value = rate;
        }
        updatePlaybackControls();
    }

    function setPlaybackPosition(seconds) {
        const { duration } = getPlaybackDetails();
        if (!Number.isFinite(duration) || duration <= 0) return;

        const position = Math.min(duration, Math.max(0, Number(seconds) || 0));
        if (state.source?.type === "youtube") {
            youtubeApiPlayer?.seekTo(position, true);
        } else {
            localPlayer.currentTime = position;
        }
        updatePlayback(state.playback.action, position);
        updatePlaybackControls();
    }

    function playLocalVideo(fileUrl, title) {
        playbackRequestId += 1;
        stopYouTubeProgressTimer();
        if (youtubeApiPlayer) youtubeApiPlayer.stopVideo();
        else youtubePlayer.src = "";
        youtubePlayer.hidden = true;
        localPlayer.src = fileUrl;
        localPlayer.hidden = false;
        idleScreen.hidden = true;
        stopStaticAnimation();
        localPlayer.volume = Number(videoVolume.value) / 100;
        localPlayer.playbackRate = 1;
        playbackSpeed.value = "1";
        localPlayer.load();
        localPlayer.play().catch(() => {});
        currentSong.textContent = title;
        state.source = { type: "upload", url: fileUrl, title };
        state.cleared = false;
        cdDeckOverride = null;
        updatePlaybackControls();
        updatePlayback("play", 0);
    }

    function playYouTubeVideo(videoId, title) {
        const requestId = ++playbackRequestId;
        stopYouTubeProgressTimer();
        localPlayer.pause();
        localPlayer.removeAttribute("src");
        localPlayer.load();
        localPlayer.hidden = true;
        idleScreen.hidden = true;
        stopStaticAnimation();
        youtubePlayer.hidden = false;
        currentSong.textContent = title;
        state.source = { type: "youtube", videoId, title };
        state.cleared = false;
        cdDeckOverride = null;
        playbackSpeed.value = "1";
        supportedYoutubeRates = [1];

        if (youtubeApiPlayer) {
            playbackControls.classList.remove("hidden");
            youtubeApiPlayer.loadVideoById(videoId);
            updatePlaybackControls();
            updatePlayback("play", 0);
            return;
        }

        playbackControls.classList.add("hidden");
        youtubePlayer.src = youtubeEmbedUrl(videoId);
        updatePlayback("play", 0);

        loadYouTubeIframeApi().then((YT) => {
            if (requestId !== playbackRequestId || state.source?.videoId !== videoId) return;

            let ready = false;
            let settled = false;
            const readyTimeout = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                showNativeYouTubeFallback(videoId, requestId);
            }, 15000);

            try {
                youtubeApiPlayer = new YT.Player("youtubePlayer", {
                    events: {
                        onReady: (event) => {
                            ready = true;
                            if (settled) return;
                            settled = true;
                            window.clearTimeout(readyTimeout);
                            youtubeApiPlayer = event.target;
                            if (requestId !== playbackRequestId || state.source?.videoId !== videoId) {
                                youtubeApiPlayer.stopVideo();
                                return;
                            }
                            youtubeApiPlayer.setVolume(Number(videoVolume.value));
                            syncYouTubePlaybackRates(youtubeApiPlayer);
                            youtubeApiPlayer.setPlaybackRate(1);
                            playbackControls.classList.remove("hidden");
                            youtubeApiPlayer.playVideo();
                            updatePlaybackControls();
                        },
                        onStateChange: handleYouTubeStateChange,
                        onPlaybackRateChange: handleYouTubePlaybackRateChange,
                        onError: () => {
                            if (!ready && !settled) {
                                settled = true;
                                window.clearTimeout(readyTimeout);
                                showNativeYouTubeFallback(videoId, requestId);
                            } else {
                                showMessage("YouTube could not play this video. Try another link.", "error");
                            }
                        }
                    }
                });
            } catch (_) {
                window.clearTimeout(readyTimeout);
                showNativeYouTubeFallback(videoId, requestId);
            }
        }).catch(() => showNativeYouTubeFallback(videoId, requestId));
    }

    function showNativeYouTubeFallback(videoId, requestId) {
        if (requestId !== playbackRequestId || state.source?.videoId !== videoId) return;
        youtubeApiPlayer = null;
        youtubePlayer.src = youtubeEmbedUrl(videoId, true);
        youtubePlayer.hidden = false;
        playbackControls.classList.add("hidden");
        showMessage("YouTube controls could not connect. Use the controls inside the video instead.", "error");
    }

    async function fetchYouTubeTitle(videoId) {
        const body = new URLSearchParams();
        body.set("videoId", videoId);

        try {
            const response = await fetch("validate_youtube.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: body.toString()
            });
            const result = await parseJsonResponse(response);
            const title = typeof result.title === "string" ? result.title.trim() : "";

            if (
                response.ok && result.success && title &&
                state.source?.type === "youtube" && state.source.videoId === videoId
            ) {
                currentSong.textContent = title;
                state.source.title = title;
                publishState();
            }
        } catch (_) {
            // Keep the fallback video ID label if YouTube metadata cannot be reached.
        }
    }

    function stopPlayers(shouldPublish = true) {
        playbackRequestId += 1;
        stopYouTubeProgressTimer();
        localPlayer.pause();
        localPlayer.removeAttribute("src");
        localPlayer.load();
        localPlayer.hidden = true;
        if (youtubeApiPlayer) youtubeApiPlayer.stopVideo();
        else youtubePlayer.src = "";
        youtubePlayer.hidden = true;
        idleScreen.hidden = false;
        startStaticAnimation();
        currentSong.textContent = "No song selected";
        state.source = null;
        state.cleared = true;
        playbackSpeed.value = "1";
        supportedYoutubeRates = [1];
        cdDeckOverride = null;
        state.playback = { action: "pause", currentTime: 0, updatedAt: Date.now() };
        updatePlaybackControls();
        if (shouldPublish) publishState();
    }

    stopButton.addEventListener("click", () => {
        stopPlayers();
        showMessage("Player cleared.", "success");
    });

    function applySettings() {
        state.settings = {
            micVolume: Number(micVolume.value),
            micEcho: Number(micEcho.value),
            videoVolume: Number(videoVolume.value)
        };
        micVolumeValue.value = `${state.settings.micVolume}%`;
        micEchoValue.value = `${state.settings.micEcho}%`;
        videoVolumeValue.value = `${state.settings.videoVolume}%`;
        syncKnobDisplays();
        localPlayer.volume = state.settings.videoVolume / 100;
        sendYoutubeCommand("setVolume", [state.settings.videoVolume]);

        if (microphone) {
            const now = microphone.context.currentTime;
            microphone.inputGain.gain.setTargetAtTime(state.settings.micVolume / 100, now, 0.015);
            const amount = state.settings.micEcho / 100;
            microphone.wetGain.gain.setTargetAtTime(amount * 0.72, now, 0.015);
            microphone.feedback.gain.setTargetAtTime(0.08 + amount * 0.55, now, 0.015);
        }
        publishState();
    }

    function syncKnobDisplays() {
        knobControls.forEach((knob) => {
            const input = $(knob.dataset.knob);
            const output = $(knob.dataset.value);
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const value = Number(input.value);
            const ratio = max === min ? 0 : (value - min) / (max - min);

            knob.style.setProperty("--knob-angle", `${-135 + ratio * 270}deg`);
            knob.setAttribute("aria-valuenow", String(value));
            knob.setAttribute("aria-valuetext", `${value}%`);
            output.textContent = `${value}%`;
        });
    }

    function setKnobValue(knob, nextValue) {
        const input = $(knob.dataset.knob);
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const step = Number(input.step) || 1;
        const bounded = Math.min(max, Math.max(min, Number(nextValue)));
        const stepped = min + Math.round((bounded - min) / step) * step;

        input.value = String(Math.min(max, Math.max(min, stepped)));
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function setControlMode(mode) {
        controlMode = mode === "hardware" ? "hardware" : "sliders";
        const hardware = controlMode === "hardware";

        controlPanel.classList.toggle("hardware-mode", hardware);
        sliderSettings.classList.toggle("hidden", hardware);
        hardwareSettings.classList.toggle("hidden", !hardware);
        cdPlayer.classList.toggle("hidden", !hardware);
        controlModeToggle.setAttribute("aria-pressed", String(hardware));
        controlModeToggle.setAttribute("aria-label", hardware
            ? "Switch to slider controls"
            : "Switch to TV knobs and CD player mode");
        controlModeToggle.textContent = hardware ? "SLIDER MODE" : "KNOBS + CD";

        if (!uploadButton.disabled) uploadButton.textContent = hardware ? "Load Disc" : "Load Video";
        if (!youtubeButton.disabled) youtubeButton.textContent = hardware ? "Load Stream" : "Load YouTube Video";

        try {
            localStorage.setItem(CONTROL_MODE_KEY, controlMode);
        } catch (_) {}

        syncKnobDisplays();
        updateCdDeck();
    }

    controlModeToggle.addEventListener("click", () => {
        const nextMode = controlMode === "hardware" ? "sliders" : "hardware";
        setControlMode(nextMode);
        if (nextMode === "hardware") knobControls[0]?.focus({ preventScroll: true });
    });

    knobControls.forEach((knob) => {
        const input = $(knob.dataset.knob);
        let drag = null;

        knob.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            event.preventDefault();
            knob.focus({ preventScroll: true });
            knob.setPointerCapture(event.pointerId);
            drag = {
                pointerId: event.pointerId,
                startY: event.clientY,
                startValue: Number(input.value)
            };
            knob.classList.add("is-dragging");
        });

        knob.addEventListener("pointermove", (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const change = ((drag.startY - event.clientY) / 140) * (max - min);
            setKnobValue(knob, drag.startValue + change);
        });

        const endDrag = (event) => {
            if (drag && drag.pointerId === event.pointerId) {
                drag = null;
                knob.classList.remove("is-dragging");
            }
        };

        knob.addEventListener("pointerup", endDrag);
        knob.addEventListener("pointercancel", endDrag);
        knob.addEventListener("lostpointercapture", endDrag);

        knob.addEventListener("wheel", (event) => {
            event.preventDefault();
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const step = Number(input.step) || 1;
            const wheelStep = Math.max(step, Math.round((max - min) / 50));
            const wheelSteps = Math.max(1, Math.round(Math.abs(event.deltaY) / 100));
            const direction = event.deltaY < 0 ? 1 : -1;
            setKnobValue(knob, Number(input.value) + direction * wheelStep * wheelSteps);
        }, { passive: false });

        knob.addEventListener("keydown", (event) => {
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const step = Number(input.step) || 1;
            const amount = step * (event.shiftKey ? 10 : 1);
            let nextValue = Number(input.value);

            if (event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "PageUp") {
                nextValue += amount * (event.key === "PageUp" ? 10 : 1);
            } else if (event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "PageDown") {
                nextValue -= amount * (event.key === "PageDown" ? 10 : 1);
            } else if (event.key === "Home") {
                nextValue = min;
            } else if (event.key === "End") {
                nextValue = max;
            } else {
                return;
            }

            event.preventDefault();
            setKnobValue(knob, nextValue);
        });
    });

    [micVolume, micEcho, videoVolume].forEach((slider) => slider.addEventListener("input", applySettings));

    async function enableMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support microphone access.");
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContextClass();
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const inputGain = context.createGain();
        const dryGain = context.createGain();
        const delay = context.createDelay(1.5);
        const wetGain = context.createGain();
        const feedback = context.createGain();
        delay.delayTime.value = 0.23;
        dryGain.gain.value = 1;
        source.connect(inputGain);
        inputGain.connect(dryGain).connect(context.destination);
        inputGain.connect(delay).connect(wetGain).connect(context.destination);
        delay.connect(feedback).connect(delay);
        microphone = { stream, context, source, inputGain, dryGain, delay, wetGain, feedback };
        applySettings();
    }

    async function disableMicrophone() {
        if (!microphone) return;
        microphone.stream.getTracks().forEach((track) => track.stop());
        await microphone.context.close();
        microphone = null;
    }

    micButton.addEventListener("click", async () => {
        micButton.disabled = true;
        try {
            if (microphone) {
                await disableMicrophone();
                micButton.textContent = "Enable Mic";
                micButton.classList.remove("active");
                micStatus.textContent = "Microphone is off. Use headphones to prevent feedback.";
            } else {
                await enableMicrophone();
                micButton.textContent = "Disable Mic";
                micButton.classList.add("active");
                micStatus.textContent = "Microphone is live through this computer’s selected audio output.";
            }
        } catch (error) {
            micStatus.textContent = `${error.message} Check the browser microphone permission.`;
        } finally {
            micButton.disabled = false;
        }
    });

    rewindButton.addEventListener("click", () => {
        const { currentTime } = getPlaybackDetails();
        setPlaybackPosition(currentTime - 10);
    });

    forwardButton.addEventListener("click", () => {
        const { currentTime } = getPlaybackDetails();
        setPlaybackPosition(currentTime + 10);
    });

    playPauseButton.addEventListener("click", () => {
        if (state.source?.type === "youtube") {
            if (!youtubeApiPlayer) return;
            const playerState = youtubeApiPlayer.getPlayerState();
            const shouldPlay = playerState !== window.YT.PlayerState.PLAYING && playerState !== window.YT.PlayerState.BUFFERING;
            if (!shouldPlay) {
                youtubeApiPlayer.pauseVideo();
            } else {
                youtubeApiPlayer.playVideo();
            }
            setPlaybackButtonState(shouldPlay);
        } else if (localPlayer.paused) {
            const playRequest = localPlayer.play();
            setPlaybackButtonState(true);
            playRequest?.catch(() => {
                updatePlaybackControls();
                showMessage("The video could not start. Press play again to retry.", "error");
            });
        } else {
            localPlayer.pause();
            setPlaybackButtonState(false);
        }
    });

    playbackSeek.addEventListener("input", () => {
        const { duration } = getPlaybackDetails();
        if (!duration) return;
        const previewTime = (Number(playbackSeek.value) / 1000) * duration;
        playbackTime.textContent = `${formatPlaybackTime(previewTime)} / ${formatPlaybackTime(duration)}`;
    });

    playbackSeek.addEventListener("change", () => {
        const { duration } = getPlaybackDetails();
        setPlaybackPosition((Number(playbackSeek.value) / 1000) * duration);
    });

    playbackSpeed.addEventListener("change", () => {
        const rate = Number(playbackSpeed.value) || 1;
        if (state.source?.type === "youtube") {
            youtubeApiPlayer?.setPlaybackRate(rate);
        } else if (state.source?.type === "upload") {
            localPlayer.playbackRate = rate;
        }
    });

    fullscreenButton.addEventListener("click", async () => {
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        try {
            if (fullscreenElement === crtScreen) {
                if (document.exitFullscreen) await document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            } else if (crtScreen.requestFullscreen) {
                await crtScreen.requestFullscreen();
            } else if (crtScreen.webkitRequestFullscreen) {
                crtScreen.webkitRequestFullscreen();
            }
        } catch (_) {
            showMessage("Fullscreen mode could not be opened. Check your browser permissions.", "error");
        }
    });

    document.addEventListener("fullscreenchange", updateFullscreenControl);
    document.addEventListener("webkitfullscreenchange", updateFullscreenControl);
    updateFullscreenControl();

    localPlayer.addEventListener("loadedmetadata", updatePlaybackControls);
    localPlayer.addEventListener("durationchange", updatePlaybackControls);
    localPlayer.addEventListener("play", () => {
        if (state.source?.type !== "upload" || state.cleared) return;
        updatePlaybackControls(true);
        updatePlayback("play", localPlayer.currentTime);
    });
    localPlayer.addEventListener("playing", () => {
        if (state.source?.type !== "upload" || state.cleared) return;
        updatePlaybackControls(true);
    });
    localPlayer.addEventListener("pause", () => {
        if (state.source?.type !== "upload" || state.cleared) return;
        updatePlaybackControls(false);
        updatePlayback("pause", localPlayer.currentTime);
    });
    localPlayer.addEventListener("waiting", () => {
        if (state.source?.type !== "upload" || state.cleared) return;
        updatePlaybackControls(!localPlayer.paused);
    });
    localPlayer.addEventListener("seeked", () => {
        if (state.source?.type !== "upload" || state.cleared) return;
        updatePlaybackControls();
        updatePlayback(localPlayer.paused ? "pause" : "play", localPlayer.currentTime);
    });
    localPlayer.addEventListener("ended", () => {
        if (state.source?.type === "upload" && !state.cleared) updatePlaybackControls(false);
    });
    localPlayer.addEventListener("timeupdate", () => {
        if (state.source?.type !== "upload" || state.cleared) return;
        updatePlaybackControls();
        if (!localPlayer.paused && Date.now() - lastProgressSent > 3000) {
            lastProgressSent = Date.now();
            updatePlayback("play", localPlayer.currentTime);
        }
    });

    channel?.addEventListener("message", (event) => {
        if (event.data?.type === "request-state") publishState();
    });

    function setBusy(button, busy, label) {
        button.disabled = busy;
        button.textContent = label;
    }

    async function parseJsonResponse(response) {
        const text = await response.text();
        try { return JSON.parse(text); }
        catch { throw new Error("The server returned an unexpected response. Check Apache/PHP and your XAMPP configuration."); }
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = `message ${type}`;
    }

    function clearMessage() {
        message.textContent = "";
        message.className = "message";
    }

    micVolume.value = state.settings.micVolume;
    micEcho.value = state.settings.micEcho;
    videoVolume.value = state.settings.videoVolume;
    setControlMode(controlMode);
    applySettings();
    if (state.source && !state.cleared) currentSong.textContent = state.source.title || "Karaoke video";
})();
