(() => {
    "use strict";

    const STORAGE_KEY = "karaokur-display-state-v1";
    const CHANNEL_NAME = "karaokur-tv-channel-v1";
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    const title = document.getElementById("tvSongTitle");
    const idle = document.getElementById("tvIdle");
    const localPlayer = document.getElementById("tvLocalPlayer");
    const youtubePlayer = document.getElementById("tvYoutubePlayer");
    const shell = document.getElementById("tvDisplayShell");
    let currentSourceKey = "";

    function sendYoutubeCommand(command, args = []) {
        youtubePlayer.contentWindow?.postMessage(JSON.stringify({
            event: "command",
            func: command,
            args
        }), "*");
    }

    function getExpectedTime(playback) {
        const start = Number(playback?.currentTime) || 0;
        if (playback?.action !== "play") return start;
        return start + Math.max(0, (Date.now() - Number(playback.updatedAt || Date.now())) / 1000);
    }

    function applyPlayback(state) {
        const playback = state.playback || {};
        const volume = Math.max(0, Math.min(100, Number(state.settings?.videoVolume ?? 80)));
        const targetTime = getExpectedTime(playback);

        if (state.source?.type === "upload") {
            localPlayer.volume = volume / 100;
            if (Math.abs(localPlayer.currentTime - targetTime) > 3) {
                try { localPlayer.currentTime = targetTime; } catch (_) {}
            }
            if (playback.action === "play") localPlayer.play().catch(() => {});
            else localPlayer.pause();
        } else if (state.source?.type === "youtube") {
            sendYoutubeCommand("setVolume", [volume]);
            if (playback.action === "pause") sendYoutubeCommand("pauseVideo");
            if (playback.action === "play") sendYoutubeCommand("playVideo");
        }
    }

    function clearDisplay() {
        currentSourceKey = "";
        localPlayer.pause();
        localPlayer.removeAttribute("src");
        localPlayer.hidden = true;
        youtubePlayer.src = "";
        youtubePlayer.hidden = true;
        idle.hidden = false;
        title.textContent = "Waiting for a song…";
    }

    function applyState(state) {
        if (!state || state.cleared || !state.source) {
            clearDisplay();
            return;
        }

        const source = state.source;
        const sourceKey = `${source.type}:${source.videoId || source.url}`;
        title.textContent = source.title || "Karaoke video";
        idle.hidden = true;

        if (sourceKey !== currentSourceKey) {
            currentSourceKey = sourceKey;
            if (source.type === "upload") {
                youtubePlayer.src = "";
                youtubePlayer.hidden = true;
                localPlayer.src = source.url;
                localPlayer.hidden = false;
                localPlayer.load();
                localPlayer.addEventListener("loadedmetadata", () => applyPlayback(state), { once: true });
            } else {
                localPlayer.pause();
                localPlayer.hidden = true;
                const origin = encodeURIComponent(window.location.origin);
                youtubePlayer.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.videoId)}?autoplay=1&controls=0&rel=0&enablejsapi=1&origin=${origin}`;
                youtubePlayer.hidden = false;
                youtubePlayer.addEventListener("load", () => applyPlayback(state), { once: true });
            }
        } else {
            applyPlayback(state);
        }
    }

    function readSavedState() {
        try { applyState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); } catch (_) {}
    }

    if (channel) {
        channel.addEventListener("message", (event) => {
            if (event.data?.type === "state") applyState(event.data.state);
        });
        channel.postMessage({ type: "request-state" });
    }

    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
            try { applyState(JSON.parse(event.newValue || "null")); } catch (_) {}
        }
    });

    function heartbeat() {
        channel?.postMessage({ type: "tv-heartbeat" });
        localStorage.setItem(`${STORAGE_KEY}-heartbeat`, String(Date.now()));
    }

    heartbeat();
    setInterval(heartbeat, 2500);
    readSavedState();

    shell.addEventListener("dblclick", () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else shell.requestFullscreen?.();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === "f") shell.requestFullscreen?.();
    });
})();
