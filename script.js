(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const libraryTab = $("libraryTab");
    const uploadTab = $("uploadTab");
    const libraryPanel = $("libraryPanel");
    const uploadPanel = $("uploadPanel");
    const librarySearch = $("librarySearch");
    const libraryList = $("libraryList");
    const libraryCount = $("libraryCount");
    const favoritesFilter = $("favoritesFilter");
    const libraryQueue = $("libraryQueue");
    const queueList = $("queueList");
    const queueCount = $("queueCount");
    const clearQueueButton = $("clearQueueButton");
    const uploadForm = $("uploadForm");
    const youtubeSongFields = $("youtubeSongFields");
    const fileSongFields = $("fileSongFields");
    const songLyrics = $("songLyrics");
    const songDetails = $("songDetails");
    const songDetailsSummary = $("songDetailsSummary");
    const videoFile = $("videoFile");
    const fileSongLyrics = $("fileSongLyrics");
    const songTitle = $("songTitle");
    const songArtist = $("songArtist");
    const findInstrumentalButton = $("findInstrumentalButton");
    const youtubeSearchResults = $("youtubeSearchResults");
    const youtubeSearchStatus = $("youtubeSearchStatus");
    const youtubeSearchResultList = $("youtubeSearchResultList");
    const selectedFile = $("selectedFile");
    const dropZone = $("dropZone");
    const youtubeUrl = $("youtubeUrl");
    const uploadButton = $("uploadButton");
    const syncedLyrics = $("syncedLyrics");
    const currentLyric = $("currentLyric");
    const nextLyric = $("nextLyric");
    const lyricNote = $("lyricNote");
    const lyricsVisibilityToggle = $("lyricsVisibilityToggle");
    const lyricsVisibilityLabel = $("lyricsVisibilityLabel");
    const lyricsSyncControls = $("lyricsSyncControls");
    const lyricsSyncRange = $("lyricsSyncRange");
    const lyricsSyncValue = $("lyricsSyncValue");
    const lyricsSyncReset = $("lyricsSyncReset");
    const currentSong = $("currentSong");
    const message = $("message");
    const idleScreen = $("idleScreen");
    const staticLayer = $("staticLayer");
    const staticContext = staticLayer?.getContext("2d", { alpha: false });
    const crtScreen = $("crtScreen");
    const localPlayer = $("localPlayer");
    const ambientFootage = $("ambientFootage");
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
    const removeSongDialog = $("removeSongDialog");
    const removeSongDialogName = $("removeSongDialogName");
    const removeSongDialogFileNote = $("removeSongDialogFileNote");
    const cancelRemoveSongButton = $("cancelRemoveSong");
    const confirmRemoveSongButton = $("confirmRemoveSong");

    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    const ALLOWED_TYPES = [
        "video/mp4", "video/webm", "video/ogg",
        "audio/ogg", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"
    ];
    const ALLOWED_EXTENSIONS = ["mp4", "webm", "ogg", "mp3", "wav", "m4a"];
    const CALMING_FOOTAGE = [
        "https://videos.pexels.com/video-files/35680193/15120521_1920_1080_25fps.mp4",
        "https://videos.pexels.com/video-files/3010831/3010831-hd_1920_1080_24fps.mp4",
        "https://videos.pexels.com/video-files/30608661/13105334_1920_1080_30fps.mp4",
        "https://videos.pexels.com/video-files/36637679/15533105_1920_1080_25fps.mp4",
        "https://videos.pexels.com/video-files/3493297/3493297-hd_1920_1080_30fps.mp4"
    ];
    const STORAGE_KEY = "karaokur-display-state-v1";
    const LYRIC_OFFSETS_KEY = "karaokur-lyric-offsets-v1";
    const CONTROL_MODE_KEY = "karaokur-control-mode-v1";
    const FAVORITES_KEY = "karaokur-library-favorites-v1";
    const QUEUE_KEY = "karaokur-library-queue-v1";
    const UNAVAILABLE_YOUTUBE_KEY = "karaokur-unavailable-youtube-v1";
    const UNAVAILABLE_LOCAL_KEY = "karaokur-unavailable-local-v1";
    const CHANNEL_NAME = "karaokur-tv-channel-v1";
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    let microphone = null;
    let lastProgressSent = 0;
    let controlMode = "sliders";
    let cdDeckOverride = null;
    let youtubeApiPlayer = null;
    let youtubeApiPromise = null;
    let youtubeProgressTimer = null;
    let selectedYouTubeCandidate = null;
    let playbackControlsHideTimer = null;
    let playbackControlsWerePlaying = false;
    let playbackRequestId = 0;
    let lastAmbientFootageUrl = "";
    let ambientFootageActive = false;
    const unavailableAmbientFootage = new Set();
    let supportedYoutubeRates = [1];
    let karaokeCatalog = [];
    let showFavoritesOnly = false;
    let favoriteSongIds = readStoredList(FAVORITES_KEY);
    let queuedSongIds = readStoredList(QUEUE_KEY);
    let unavailableYoutubeVideoIds = readStoredList(UNAVAILABLE_YOUTUBE_KEY);
    let unavailableLocalSongIds = readStoredList(UNAVAILABLE_LOCAL_KEY);
    let lyricOffsets = readStoredMap(LYRIC_OFFSETS_KEY);
    let staticFrame = null;
    let staticTimer = null;
    const reduceStaticMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let state = {
        source: null,
        cleared: true,
        lyricsVisible: true,
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
            ? getUploadTitle(selectedFile)
            : "NO DISC LOADED";
        const title = cdDeckOverride?.title ?? source?.title ?? selectedTitle;
        const status = cdDeckOverride?.status ?? (
            source
                ? state.playback.action === "play" ? "PLAYING VIDEO" : "PAUSED"
                : selectedFile ? "DISC READY" : "READY TO LOAD"
        );
        const isLoading = status === "LOADING VIDEO" || status === "CHECKING LINK" || status === "ADDING SONG";
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

    const sourceTabs = [
        { button: libraryTab, panel: libraryPanel, type: "library" },
        { button: uploadTab, panel: uploadPanel, type: "upload" }
    ];

    function setTab(type, moveFocus = false) {
        sourceTabs.forEach(({ button, panel, type: tabType }) => {
            const active = tabType === type;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
            panel.classList.toggle("hidden", !active);
            if (moveFocus && active) button.focus();
        });
        clearMessage();
    }

    sourceTabs.forEach(({ button, type }) => {
        button.addEventListener("click", () => setTab(type));
        button.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const currentIndex = sourceTabs.findIndex((tab) => tab.button === button);
            const nextIndex = event.key === "Home" ? 0
                : event.key === "End" ? sourceTabs.length - 1
                    : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + sourceTabs.length) % sourceTabs.length;
            setTab(sourceTabs[nextIndex].type, true);
        });
    });
    setTab("library");

    function readStoredList(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string"))] : [];
        } catch (_) {
            return [];
        }
    }

    function persistStoredList(key, values) {
        try {
            localStorage.setItem(key, JSON.stringify(values));
        } catch (_) {
            showMessage("Your browser could not save this library change.", "error");
        }
    }

    function readStoredMap(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "{}");
            if (!value || typeof value !== "object" || Array.isArray(value)) return {};
            return Object.fromEntries(Object.entries(value).filter(([, offset]) => Number.isFinite(Number(offset))));
        } catch (_) {
            return {};
        }
    }

    function savedLyricOffset(key) {
        return key && Number.isFinite(Number(lyricOffsets[key])) ? Number(lyricOffsets[key]) : 0;
    }

    function saveLyricOffset(key, offset) {
        if (!key) return;
        if (Math.abs(offset) < 0.001) delete lyricOffsets[key];
        else lyricOffsets[key] = offset;
        try {
            localStorage.setItem(LYRIC_OFFSETS_KEY, JSON.stringify(lyricOffsets));
        } catch (_) {
            showMessage("Your browser could not save this song's lyric timing.", "error");
        }
    }

    function createLibraryElement(tagName, className = "", text = "") {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }

    function findCatalogSong(songId) {
        return karaokeCatalog.find((song) => song.id === songId);
    }

    function isUserLibrarySong(song) {
        return typeof song?.id === "string"
            && ["user-", "local-", "youtube-"].some((prefix) => song.id.startsWith(prefix));
    }

    function confirmSongRemoval(song) {
        if (!removeSongDialog?.showModal) {
            return Promise.resolve(window.confirm(`Remove ${song.title} from your song library?`));
        }

        removeSongDialogName.textContent = song.title;
        removeSongDialogFileNote.hidden = !song.localVideoUrl;
        removeSongDialog.returnValue = "";

        return new Promise((resolve) => {
            removeSongDialog.addEventListener("close", () => {
                resolve(removeSongDialog.returnValue === "remove");
            }, { once: true });
            removeSongDialog.showModal();
            cancelRemoveSongButton.focus();
        });
    }

    cancelRemoveSongButton?.addEventListener("click", () => removeSongDialog.close("cancel"));
    confirmRemoveSongButton?.addEventListener("click", () => removeSongDialog.close("remove"));
    removeSongDialog?.addEventListener("click", (event) => {
        if (event.target === removeSongDialog) removeSongDialog.close("cancel");
    });

    function isPlayableCatalogSong(song) {
        if (!song) return false;
        const localMedia = typeof song.localVideoUrl === "string"
            && song.localVideoUrl.trim() !== ""
            && !unavailableLocalSongIds.includes(song.id);
        const videoId = song.video?.videoId;
        const playableYoutube = typeof videoId === "string"
            && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
            && !unavailableYoutubeVideoIds.includes(videoId);
        return localMedia || playableYoutube;
    }

    function playCatalogSong(song) {
        if (!isPlayableCatalogSong(song)) return;
        removeQueuedSong(song.id);

        if (song?.localVideoUrl) {
            playLocalAudio(song.localVideoUrl, song.title, song);
            showMessage(`Playing ${song.title} in Karaokur.`, "success");
            return;
        }
        if (!song?.video?.videoId) return;
        const title = song.video.title || `${song.title} karaoke`;
        playYouTubeVideo(song.video.videoId, title, song);
        showMessage(`Loading ${title}.`, "success");
    }

    function makeVideoAction(song) {
        if (isPlayableCatalogSong(song)) {
            const playButton = createLibraryElement("button", "primary-btn library-action", "Play");
            playButton.type = "button";
            playButton.addEventListener("click", () => playCatalogSong(song));
            return playButton;
        }

        const unavailable = createLibraryElement("button", "secondary-btn library-action library-video-unavailable", "No video");
        unavailable.type = "button";
        unavailable.disabled = true;
        return unavailable;
    }

    function toggleFavorite(song) {
        const position = favoriteSongIds.indexOf(song.id);
        if (position === -1) favoriteSongIds.push(song.id);
        else favoriteSongIds.splice(position, 1);
        persistStoredList(FAVORITES_KEY, favoriteSongIds);
        renderLibrary();
    }

    async function removeLibrarySong(song) {
        if (!isUserLibrarySong(song)) return;
        if (!await confirmSongRemoval(song)) return;

        try {
            const body = new URLSearchParams({ id: song.id });
            const response = await fetch("remove_song.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: body.toString()
            });
            const result = await parseJsonResponse(response);
            if (!response.ok || !result.success) throw new Error(result.message || "The song could not be removed.");

            karaokeCatalog = karaokeCatalog.filter((entry) => entry.id !== song.id);
            favoriteSongIds = favoriteSongIds.filter((id) => id !== song.id);
            queuedSongIds = queuedSongIds.filter((id) => id !== song.id);
            persistStoredList(FAVORITES_KEY, favoriteSongIds);
            persistStoredList(QUEUE_KEY, queuedSongIds);
            if (state.source?.songId === song.id) stopPlayers();
            renderQueue();
            renderLibrary();
            showMessage(result.fileDeleted === false
                ? `${song.title} was removed, but its saved media file could not be deleted.`
                : `${song.title} was removed from your song library.`, "success");
        } catch (error) {
            showMessage(error.message || "The song could not be removed from your library.", "error");
        }
    }

    function queueSong(song) {
        if (!isPlayableCatalogSong(song) || queuedSongIds.includes(song.id)) return;
        queuedSongIds.push(song.id);
        persistStoredList(QUEUE_KEY, queuedSongIds);
        renderQueue();
        renderLibrary();
    }

    function removeQueuedSong(songId) {
        const remaining = queuedSongIds.filter((id) => id !== songId);
        if (remaining.length === queuedSongIds.length) return;
        queuedSongIds = remaining;
        persistStoredList(QUEUE_KEY, queuedSongIds);
        renderQueue();
        renderLibrary();
    }

    function playNextQueuedSong() {
        while (queuedSongIds.length) {
            const nextSong = findCatalogSong(queuedSongIds.shift());
            if (!isPlayableCatalogSong(nextSong)) continue;

            persistStoredList(QUEUE_KEY, queuedSongIds);
            renderQueue();
            renderLibrary();
            playCatalogSong(nextSong);
            return true;
        }

        persistStoredList(QUEUE_KEY, queuedSongIds);
        renderQueue();
        renderLibrary();
        return false;
    }

    function renderLibrary() {
        if (!libraryList) return;
        const query = librarySearch.value.trim().toLocaleLowerCase();
        const visibleSongs = karaokeCatalog.filter((song) => {
            const searchable = [song.title, song.artist].filter(Boolean).join(" ").toLocaleLowerCase();
            return (!query || searchable.includes(query))
                && (!showFavoritesOnly || favoriteSongIds.includes(song.id));
        });

        if (libraryCount) {
            const visibleCount = visibleSongs.length;
            const songLabel = `${visibleCount} ${visibleCount === 1 ? "song" : "songs"}`;
            libraryCount.textContent = showFavoritesOnly
                ? `${visibleCount} ${visibleCount === 1 ? "favorite" : "favorites"}`
                : query
                    ? `${songLabel} found`
                    : `${karaokeCatalog.length} ${karaokeCatalog.length === 1 ? "song" : "songs"}`;
        }

        libraryList.replaceChildren();
        if (!visibleSongs.length) {
            libraryList.append(createLibraryElement("p", "library-empty", showFavoritesOnly && !favoriteSongIds.length
                ? "No favorites yet."
                : query
                    ? "No songs match that search. Try another title or artist."
                    : "No songs in your library yet. Add a song to get started."));
            return;
        }

        visibleSongs.forEach((song) => {
            const card = createLibraryElement("article", "library-card");
            const heading = createLibraryElement("div", "library-card-heading");
            const title = createLibraryElement("h3", "", song.title);
            const tools = createLibraryElement("div", "library-card-tools");
            const isFavorite = favoriteSongIds.includes(song.id);
            const favoriteButton = createLibraryElement("button", "library-favorite");
            const favoriteIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const favoritePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            favoriteIcon.setAttribute("viewBox", "0 0 24 24");
            favoriteIcon.setAttribute("aria-hidden", "true");
            favoriteIcon.setAttribute("focusable", "false");
            favoriteIcon.classList.add("library-favorite-icon");
            favoritePath.setAttribute("d", "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z");
            favoriteIcon.append(favoritePath);
            favoriteButton.append(favoriteIcon);
            favoriteButton.type = "button";
            favoriteButton.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${song.title} ${isFavorite ? "from" : "to"} favorites`);
            favoriteButton.setAttribute("aria-pressed", String(isFavorite));
            favoriteButton.addEventListener("click", () => toggleFavorite(song));
            if (isUserLibrarySong(song)) {
                const removeButton = createLibraryElement("button", "library-remove-song");
                const removeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                removeIcon.setAttribute("viewBox", "0 0 24 24");
                removeIcon.setAttribute("aria-hidden", "true");
                removeIcon.setAttribute("focusable", "false");
                removeIcon.classList.add("library-remove-icon");
                const removePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                removePath.setAttribute("d", "M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3");
                removeIcon.append(removePath);
                removeButton.append(removeIcon);
                removeButton.type = "button";
                removeButton.title = "Remove from song library";
                removeButton.setAttribute("aria-label", `Remove ${song.title} from song library`);
                removeButton.addEventListener("click", () => removeLibrarySong(song));
                tools.append(removeButton);
            }
            tools.append(favoriteButton);
            heading.append(title, tools);

            const details = song.artist ? createLibraryElement("p", "library-card-details", song.artist) : null;
            const actions = createLibraryElement("div", "library-card-actions");
            actions.append(makeVideoAction(song));
            if (isPlayableCatalogSong(song)) {
                const isQueued = queuedSongIds.includes(song.id);
                const addButton = createLibraryElement("button", "secondary-btn library-action library-queue-add", isQueued ? "Queued" : "Queue");
                addButton.type = "button";
                addButton.disabled = isQueued;
                addButton.setAttribute("aria-label", isQueued ? `${song.title} is queued` : `Add ${song.title} to queue`);
                addButton.addEventListener("click", () => queueSong(song));
                actions.append(addButton);
            } else {
                actions.querySelector(".library-video-unavailable")?.classList.add("library-video-unavailable-full");
            }

            card.append(heading);
            if (details) card.append(details);
            card.append(actions);
            libraryList.append(card);
        });
    }

    function renderQueue() {
        if (!queueList) return;
        queuedSongIds = queuedSongIds.filter((songId, index, values) => {
            return isPlayableCatalogSong(findCatalogSong(songId)) && values.indexOf(songId) === index;
        });
        libraryQueue.hidden = queuedSongIds.length === 0;
        if (!queuedSongIds.length) libraryQueue.open = false;
        queueCount.textContent = String(queuedSongIds.length);
        clearQueueButton.disabled = queuedSongIds.length === 0;
        queueList.replaceChildren();

        queuedSongIds.forEach((songId, index) => {
            const song = findCatalogSong(songId);
            if (!song) return;
            const item = createLibraryElement("li", `library-queue-item${index === 0 ? " is-next" : ""}`);
            const number = createLibraryElement("span", "library-queue-number", String(index + 1).padStart(2, "0"));
            const name = createLibraryElement("span", "library-queue-name", song.title);
            const actions = createLibraryElement("div", "library-queue-actions");
            actions.append(makeVideoAction(song));
            const removeButton = createLibraryElement("button", "library-remove-button", "Remove");
            removeButton.type = "button";
            removeButton.setAttribute("aria-label", `Remove ${song.title} from queue`);
            removeButton.addEventListener("click", () => removeQueuedSong(songId));
            actions.append(removeButton);
            item.append(number, name, actions);
            queueList.append(item);
        });
        persistStoredList(QUEUE_KEY, queuedSongIds);
    }

    async function loadSongCatalog() {
        try {
            const [response, userResponse] = await Promise.all([
                fetch("platinum_catalog.json", { cache: "no-cache" }),
                fetch("user_songs.json", { cache: "no-cache" }).catch(() => null)
            ]);
            if (!response.ok) throw new Error(`Catalog request returned ${response.status}`);
            const catalog = await response.json();
            if (!Array.isArray(catalog.songs)) throw new Error("Catalog has no song list");
            let userSongs = [];
            if (userResponse?.ok) {
                try {
                    const savedLibrary = await userResponse.json();
                    if (Array.isArray(savedLibrary.songs)) userSongs = savedLibrary.songs;
                } catch (_) {}
            }
            const seenSongKeys = new Set();
            karaokeCatalog = [...userSongs].reverse().concat(catalog.songs)
                .filter(isPlayableCatalogSong)
                .filter((song) => {
                    const key = `${String(song.title || "").trim().toLocaleLowerCase()}::${String(song.artist || "").trim().toLocaleLowerCase()}`;
                    if (seenSongKeys.has(key)) return false;
                    seenSongKeys.add(key);
                    return true;
                });
            favoriteSongIds = favoriteSongIds.filter((id) => findCatalogSong(id));
            if (userResponse?.ok && state.source?.songId && !findCatalogSong(state.source.songId)) {
                stopPlayers();
            }
            renderLibrary();
            renderQueue();
        } catch (_) {
            libraryList.replaceChildren(createLibraryElement("p", "library-empty", "Couldn’t load songs. Refresh to try again."));
        }
    }

    librarySearch.addEventListener("input", renderLibrary);
    favoritesFilter.addEventListener("click", () => {
        showFavoritesOnly = !showFavoritesOnly;
        favoritesFilter.setAttribute("aria-pressed", String(showFavoritesOnly));
        favoritesFilter.classList.toggle("active", showFavoritesOnly);
        renderLibrary();
    });
    clearQueueButton.addEventListener("click", () => {
        queuedSongIds = [];
        persistStoredList(QUEUE_KEY, queuedSongIds);
        renderQueue();
        renderLibrary();
    });
    const songCatalogReady = loadSongCatalog();

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
        if (!file) return "Please choose a video or song first.";
        const extension = getExtension(file.name);
        if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
            return "Use MP4, WebM, OGG, MP3, WAV, or M4A files.";
        }
        if (file.size > MAX_FILE_SIZE) return "The file is larger than 500 MB.";
        return "";
    }

    function getUploadTitle(file) {
        return songTitle.value.trim() || file.name.replace(/\.[^.]+$/, "") || "Uploaded song";
    }

    videoFile.addEventListener("change", () => {
        const file = videoFile.files[0];
        selectedFile.textContent = file ? file.name : "No file selected";
        const error = validateFile(file);
        if (file && error) {
            showMessage(error, "error");
            setCdDeckOverride("INVALID FILE", file.name);
        } else {
            clearMessage();
            if (file) setCdDeckOverride("DISC SELECTED", getUploadTitle(file));
            else clearCdDeckOverride();
        }
    });

    songTitle.addEventListener("input", () => {
        const file = videoFile.files[0];
        if (file) setCdDeckOverride("DISC SELECTED", getUploadTitle(file));
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

    function selectedSongSource() {
        return uploadForm.querySelector('input[name="songSource"]:checked')?.value || "youtube";
    }

    function syncLyricsLookupRequirements(openForAutomaticLookup = false) {
        const isYouTube = selectedSongSource() === "youtube";
        const automaticLookup = isYouTube && !songLyrics.value.trim();
        songTitle.required = !isYouTube || automaticLookup;
        songArtist.required = !isYouTube;
        if (automaticLookup && openForAutomaticLookup) songDetails.open = true;
        songDetailsSummary.textContent = isYouTube
            ? automaticLookup ? "Song details (title required; artist optional)" : "Song details (optional with pasted lyrics)"
            : "Song details";
    }

    function updateSongSourceFields() {
        const isYouTube = selectedSongSource() === "youtube";
        youtubeSongFields.classList.toggle("hidden", !isYouTube);
        fileSongFields.classList.toggle("hidden", isYouTube);
        youtubeUrl.required = isYouTube;
        songLyrics.required = false;
        videoFile.required = false;
        songDetails.open = !isYouTube || !songLyrics.value.trim() || Boolean(songTitle.value.trim() || songArtist.value.trim());
        syncLyricsLookupRequirements();
        clearMessage();
    }

    songLyrics.addEventListener("input", () => syncLyricsLookupRequirements(true));
    uploadForm.querySelectorAll('input[name="songSource"]').forEach((input) => {
        input.addEventListener("change", updateSongSourceFields);
    });
    updateSongSourceFields();

    function renderYouTubeSearchResults(results) {
        youtubeSearchResultList.replaceChildren();
        if (!results.length) {
            youtubeSearchStatus.textContent = "No playable karaoke or instrumental videos matched. Try checking the title or artist.";
            return;
        }

        youtubeSearchStatus.textContent = `Choose a video. Karaokur will match your lyrics to available timing when you add it.`;
        results.forEach((candidate) => {
            const result = createLibraryElement("article", "youtube-search-result");
            if (selectedYouTubeCandidate?.videoId === candidate.videoId) result.classList.add("is-selected");

            if (candidate.thumbnailUrl) {
                const thumbnail = document.createElement("img");
                thumbnail.className = "youtube-search-thumbnail";
                thumbnail.src = candidate.thumbnailUrl;
                thumbnail.alt = "";
                thumbnail.loading = "lazy";
                result.append(thumbnail);
            }

            const details = createLibraryElement("div", "youtube-search-details");
            details.append(
                createLibraryElement("p", "youtube-search-title", candidate.title || "YouTube video"),
                createLibraryElement("p", "youtube-search-channel", candidate.channel || "YouTube")
            );

            const chooseButton = createLibraryElement("button", "secondary-btn youtube-search-select", "Use this video");
            chooseButton.type = "button";
            chooseButton.setAttribute("aria-pressed", String(selectedYouTubeCandidate?.videoId === candidate.videoId));
            chooseButton.addEventListener("click", () => {
                selectedYouTubeCandidate = candidate;
                youtubeUrl.value = candidate.url;
                youtubeSearchResultList.querySelectorAll(".youtube-search-result").forEach((item) => item.classList.remove("is-selected"));
                youtubeSearchResultList.querySelectorAll(".youtube-search-select").forEach((button) => {
                    button.textContent = "Use this video";
                    button.setAttribute("aria-pressed", "false");
                });
                result.classList.add("is-selected");
                chooseButton.textContent = "Selected";
                chooseButton.setAttribute("aria-pressed", "true");
                showMessage("Video selected. Add it to the library to match and sync the lyrics.", "success");
            });

            details.append(chooseButton);
            result.append(details);
            youtubeSearchResultList.append(result);
        });
    }

    findInstrumentalButton.addEventListener("click", async () => {
        const title = songTitle.value.trim();
        const artist = songArtist.value.trim();
        const lyrics = songLyrics.value.trim();
        songDetails.open = true;
        syncLyricsLookupRequirements();

        if (!title) {
            showMessage("Enter the song title in Song details before searching.", "error");
            songTitle.focus();
            return;
        }
        selectedYouTubeCandidate = null;
        youtubeSearchResultList.replaceChildren();
        youtubeSearchResults.classList.remove("hidden");
        youtubeSearchStatus.textContent = "Searching for playable karaoke and instrumental videos…";
        setBusy(findInstrumentalButton, true, "Searching…");
        clearMessage();

        try {
            const response = await fetch("search_youtube.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: new URLSearchParams({ title, artist, lyrics }).toString()
            });
            const result = await parseJsonResponse(response);
            if (!response.ok || !result.success) throw new Error(result.message || "YouTube search could not be completed.");
            renderYouTubeSearchResults(Array.isArray(result.results) ? result.results : []);
        } catch (error) {
            youtubeSearchStatus.textContent = error.message || "YouTube search could not be completed.";
            showMessage(error.message || "YouTube search could not be completed.", "error");
        } finally {
            setBusy(findInstrumentalButton, false, "Find an instrumental");
        }
    });

    youtubeUrl.addEventListener("input", () => {
        if (selectedYouTubeCandidate && youtubeUrl.value.trim() !== selectedYouTubeCandidate.url) {
            selectedYouTubeCandidate = null;
            youtubeSearchResultList.querySelectorAll(".youtube-search-result").forEach((item) => item.classList.remove("is-selected"));
            youtubeSearchResultList.querySelectorAll(".youtube-search-select").forEach((button) => {
                button.textContent = "Use this video";
                button.setAttribute("aria-pressed", "false");
            });
        }
    });

    async function addSongToVisibleLibrary(song) {
        await songCatalogReady;
        if (!isPlayableCatalogSong(song)) throw new Error("The saved song could not be played.");
        const songKey = `${String(song.title).trim().toLocaleLowerCase()}::${String(song.artist).trim().toLocaleLowerCase()}`;
        karaokeCatalog = [song, ...karaokeCatalog.filter((entry) => {
            const entryKey = `${String(entry.title).trim().toLocaleLowerCase()}::${String(entry.artist).trim().toLocaleLowerCase()}`;
            return entry.id !== song.id && entryKey !== songKey;
        })];
        showFavoritesOnly = false;
        favoritesFilter.setAttribute("aria-pressed", "false");
        favoritesFilter.classList.remove("active");
        librarySearch.value = "";
        renderLibrary();
        renderQueue();
        uploadForm.reset();
        selectedYouTubeCandidate = null;
        youtubeSearchResults.classList.add("hidden");
        youtubeSearchStatus.textContent = "";
        youtubeSearchResultList.replaceChildren();
        selectedFile.textContent = "No file selected";
        updateSongSourceFields();
        setTab("library");
    }

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = songTitle.value.trim();
        const artist = songArtist.value.trim();
        const isYouTube = selectedSongSource() === "youtube";
        const file = videoFile.files[0];
        if (!isYouTube && (!title || !artist)) {
            showMessage("Enter both the song title and artist.", "error");
            return;
        }
        if (!isYouTube) {
            const validationError = validateFile(file);
            if (validationError) {
                showMessage(validationError, "error");
                return;
            }
        } else if (!youtubeUrl.value.trim()) {
            showMessage("Paste a YouTube link first.", "error");
            return;
        }

        const automaticLyricsLookup = isYouTube && !songLyrics.value.trim();
        setBusy(uploadButton, true, isYouTube ? automaticLyricsLookup ? "Adding song..." : "Matching lyrics..." : "Matching lyrics...");
        showMessage(isYouTube
            ? automaticLyricsLookup ? "Adding the song and checking for timed lyrics..." : "Matching your lyrics with available song timing..."
            : "Finding timed lyrics and adding your song...", "success");
        setCdDeckOverride("ADDING SONG", title || "YOUTUBE SONG");

        try {
            let response;
            let result;
            if (isYouTube) {
                const candidate = selectedYouTubeCandidate;
                const body = candidate
                    ? new URLSearchParams({ videoId: candidate.videoId })
                    : new URLSearchParams({ url: youtubeUrl.value.trim() });
                response = await fetch("validate_youtube.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    body: body.toString()
                });
                result = await parseJsonResponse(response);
                if (!response.ok || !result.success) throw new Error(result.message || "Invalid YouTube link.");

                body.delete("url");
                body.set("videoId", result.videoId);
                body.set("title", title);
                body.set("artist", artist);
                body.set("videoTitle", typeof result.title === "string" && result.title ? result.title : (candidate?.title || ""));
                body.set("lyrics", songLyrics.value.trim());
                response = await fetch("add_youtube_song.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    body: body.toString()
                });
            } else {
                const formData = new FormData();
                formData.append("video", file);
                formData.append("title", title);
                formData.append("artist", artist);
                formData.append("lyrics", fileSongLyrics.value.trim());
                response = await fetch("upload.php", { method: "POST", body: formData });
            }
            result = await parseJsonResponse(response);
            if (!response.ok || !result.success) throw new Error(result.message || "The song could not be added.");
            await addSongToVisibleLibrary(result.song);
            showMessage(isYouTube
                ? result.lyricsFound
                    ? `${result.song.title} was added with synced lyrics${automaticLyricsLookup ? " found automatically" : ""}.`
                    : `${result.song.title} was added and is ready to play. No timed lyrics were found, so lyrics will not appear.`
                : result.lyricsFound
                    ? `${title} by ${artist} was added with timed lyrics.`
                    : `${title} by ${artist} was added and is ready to play. No timed lyrics were found, so lyrics will not appear.`, "success");
        } catch (error) {
            showMessage(error.message || "The song could not be added to your library.", "error");
        } finally {
            clearCdDeckOverride();
            setBusy(uploadButton, false, "Add to Song Library");
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

    function youtubeEmbedUrl(videoId, showNativeControls = true) {
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

    function updateSyncedLyrics(currentTime = 0, duration = 0) {
        const source = state.source;
        const cues = source?.lyricCues;
        if (!Array.isArray(cues) || !cues.length) {
            syncedLyrics.hidden = true;
            lyricsVisibilityToggle.hidden = true;
            lyricsSyncControls.hidden = true;
            return;
        }

        lyricsVisibilityToggle.hidden = false;
        lyricsSyncControls.hidden = false;
        const offset = Number(source.lyricOffsetSeconds) || 0;
        if (document.activeElement !== lyricsSyncRange) lyricsSyncRange.value = String(offset);
        const offsetLabel = `${offset > 0 ? "+" : ""}${offset.toFixed(2)} s`;
        if (lyricsSyncValue.textContent !== offsetLabel) lyricsSyncValue.textContent = offsetLabel;
        lyricsSyncReset.disabled = Math.abs(offset) < 0.001;
        const lyricsVisible = state.lyricsVisible !== false;
        syncedLyrics.hidden = !lyricsVisible;
        lyricsVisibilityToggle.setAttribute("aria-pressed", String(lyricsVisible));
        lyricsVisibilityToggle.setAttribute("aria-label", lyricsVisible ? "Hide lyrics" : "Show lyrics");
        lyricsVisibilityToggle.title = lyricsVisible ? "Hide lyrics" : "Show lyrics";
        const label = lyricsVisible ? "Hide lyrics" : "Show lyrics";
        if (lyricsVisibilityLabel.textContent !== label) lyricsVisibilityLabel.textContent = label;
        if (!lyricsVisible) return;

        const lyricTime = currentTime - offset;
        let activeIndex = -1;
        for (let index = 0; index < cues.length; index++) {
            if (Number(cues[index].start) > lyricTime) break;
            activeIndex = index;
        }
        if (activeIndex < 0) {
            currentLyric.textContent = "Lyrics begin shortly…";
        } else if (window.KaraokurLyricDisplay) {
            window.KaraokurLyricDisplay.renderCurrentLine(currentLyric, cues, activeIndex, lyricTime, duration);
        } else {
            currentLyric.textContent = String(cues[activeIndex].text || "");
        }
        nextLyric.textContent = String(cues[activeIndex + 1]?.text || "");

        const referenceDuration = Number(source.timingReferenceDuration);
        lyricNote.textContent = duration > 0 && referenceDuration > 0 && Math.abs(duration - referenceDuration) > 12
            ? "This video differs from the timing source. Use Sync to adjust a fixed delay."
            : "";
    }

    lyricsVisibilityToggle.addEventListener("click", () => {
        state.lyricsVisible = state.lyricsVisible === false;
        updatePlaybackControls();
        publishState();
    });

    function setLyricOffset(value) {
        const source = state.source;
        if (!source || !Array.isArray(source.lyricCues) || !source.lyricCues.length) return;
        const bounded = Math.max(-30, Math.min(30, Number(value) || 0));
        const offset = Math.round(bounded * 4) / 4;
        source.lyricOffsetSeconds = Object.is(offset, -0) ? 0 : offset;
        saveLyricOffset(source.lyricOffsetKey, source.lyricOffsetSeconds);
        const details = getPlaybackDetails();
        updateSyncedLyrics(details.currentTime, details.duration);
        publishState();
    }

    lyricsSyncRange.addEventListener("input", () => setLyricOffset(lyricsSyncRange.value));
    lyricsSyncReset.addEventListener("click", () => setLyricOffset(0));

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

        playbackControls.classList.toggle("hidden", !canControl || state.source?.type === "youtube");
        syncPlaybackControlsVisibility(canControl, isPlaying);
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

        updateSyncedLyrics(currentTime, duration);

        return { currentTime, duration, isPlaying };
    }

    function clearPlaybackControlsHideTimer() {
        if (playbackControlsHideTimer) window.clearTimeout(playbackControlsHideTimer);
        playbackControlsHideTimer = null;
    }

    function revealPlaybackControls() {
        playbackControls.classList.remove("is-idle");
        clearPlaybackControlsHideTimer();
        const autoHideSource = state.source?.type === "upload" || state.source?.type === "youtube";
        if (!autoHideSource || !getPlaybackDetails().isPlaying) return;

        playbackControlsHideTimer = window.setTimeout(() => {
            playbackControlsHideTimer = null;
            if (
                (state.source?.type === "upload" || state.source?.type === "youtube") &&
                getPlaybackDetails().isPlaying &&
                !playbackControls.matches(":focus-within")
            ) {
                playbackControls.classList.add("is-idle");
            }
        }, 2600);
    }

    function syncPlaybackControlsVisibility(canControl, isPlaying) {
        const sourceType = state.source?.type;
        const canAutoHide = canControl && sourceType === "upload";
        crtScreen.classList.remove("youtube-playback-active");
        if (!canAutoHide || !isPlaying) {
            playbackControlsWerePlaying = false;
            clearPlaybackControlsHideTimer();
            playbackControls.classList.remove("is-idle");
            return;
        }

        if (!playbackControlsWerePlaying) {
            playbackControlsWerePlaying = true;
            revealPlaybackControls();
        }
    }

    crtScreen.addEventListener("pointermove", revealPlaybackControls, { passive: true });
    crtScreen.addEventListener("pointerdown", revealPlaybackControls);
    playbackControls.addEventListener("focusin", revealPlaybackControls);
    playbackControls.addEventListener("focusout", (event) => {
        if (!playbackControls.contains(event.relatedTarget)) revealPlaybackControls();
    });

    function setPlaybackButtonState(isPlaying) {
        playPauseButton.setAttribute("aria-label", isPlaying ? "Pause song" : "Play song");
        playPauseButton.title = isPlaying ? "Pause song" : "Play song";
        playIcon.toggleAttribute("hidden", isPlaying);
        pauseIcon.toggleAttribute("hidden", !isPlaying);
    }

    function updateFullscreenControl() {
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        const isFullscreen = fullscreenElement === crtScreen;
        const supportsFullscreen = Boolean(crtScreen.requestFullscreen || crtScreen.webkitRequestFullscreen);

        fullscreenButton.disabled = !supportsFullscreen;
        fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit full screen" : "Maximize karaoke player");
        fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
        fullscreenButton.title = isFullscreen ? "Exit full screen" : "Maximize karaoke player";
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
        if (playerState === window.YT.PlayerState.ENDED && playNextQueuedSong()) return;
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

    function markLocalSongUnavailable(songId, requestId) {
        if (!songId || state.source?.requestId !== requestId) return false;
        const song = findCatalogSong(songId);
        if (!song) return false;

        unavailableLocalSongIds = [...new Set([...unavailableLocalSongIds, songId])];
        karaokeCatalog = karaokeCatalog.filter((entry) => entry.id !== songId);
        favoriteSongIds = favoriteSongIds.filter((id) => id !== songId);
        queuedSongIds = queuedSongIds.filter((id) => id !== songId);
        persistStoredList(UNAVAILABLE_LOCAL_KEY, unavailableLocalSongIds);
        persistStoredList(FAVORITES_KEY, favoriteSongIds);
        persistStoredList(QUEUE_KEY, queuedSongIds);
        renderQueue();
        renderLibrary();
        stopPlayers();
        showMessage(`${song.title} could not play in this browser and was removed from the library.`, "error");
        return true;
    }

    function markYouTubeVideoUnavailable(videoId) {
        const affectedSongs = karaokeCatalog.filter((song) => song.video?.videoId === videoId);
        if (!affectedSongs.length) return false;

        const removedIds = new Set(affectedSongs.map((song) => song.id));
        unavailableYoutubeVideoIds = [...new Set([...unavailableYoutubeVideoIds, videoId])];
        karaokeCatalog = karaokeCatalog.filter((song) => !removedIds.has(song.id));
        favoriteSongIds = favoriteSongIds.filter((songId) => !removedIds.has(songId));
        queuedSongIds = queuedSongIds.filter((songId) => !removedIds.has(songId));
        persistStoredList(UNAVAILABLE_YOUTUBE_KEY, unavailableYoutubeVideoIds);
        persistStoredList(FAVORITES_KEY, favoriteSongIds);
        persistStoredList(QUEUE_KEY, queuedSongIds);
        renderQueue();
        renderLibrary();

        const title = affectedSongs[0].title;
        if (state.source?.videoId === videoId) stopPlayers();
        showMessage(`${title} cannot play in Karaokur and was removed from the library.`, "error");
        return true;
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

    function chooseAmbientFootage() {
        let candidates = CALMING_FOOTAGE.filter((url) => !unavailableAmbientFootage.has(url) && url !== lastAmbientFootageUrl);
        if (!candidates.length) candidates = CALMING_FOOTAGE.filter((url) => !unavailableAmbientFootage.has(url));
        if (!candidates.length) return "";
        const url = candidates[Math.floor(Math.random() * candidates.length)];
        lastAmbientFootageUrl = url;
        return url;
    }

    function startAmbientFootage(url) {
        ambientFootageActive = Boolean(url);
        if (!url) {
            ambientFootage.hidden = true;
            return;
        }
        ambientFootage.dataset.clipUrl = url;
        ambientFootage.hidden = false;
        ambientFootage.src = url;
        ambientFootage.load();
        ambientFootage.play().catch(() => {});
    }

    function handleAmbientFootageError(url) {
        if (!ambientFootageActive || !url) return;
        unavailableAmbientFootage.add(url);
        const nextUrl = chooseAmbientFootage();
        if (!nextUrl) {
            ambientFootage.hidden = true;
            return;
        }
        startAmbientFootage(nextUrl);
    }

    ambientFootage.addEventListener("error", () => {
        handleAmbientFootageError(ambientFootage.dataset.clipUrl || "");
    });

    function stopAmbientFootage() {
        ambientFootageActive = false;
        ambientFootage.pause();
        ambientFootage.removeAttribute("src");
        ambientFootage.load();
        ambientFootage.hidden = true;
        delete ambientFootage.dataset.clipUrl;
    }

    function playLocalAudio(fileUrl, title, song = null) {
        const requestId = ++playbackRequestId;
        lyricsSyncControls.open = false;
        stopAmbientFootage();
        crtScreen.classList.remove("has-youtube-video");
        crtScreen.classList.add("has-ambient-visual");
        currentSong.textContent = title;
        const visualUrl = chooseAmbientFootage();
        const lyricOffsetKey = song?.id ? `song:${song.id}` : `upload:${fileUrl}`;
        state.source = {
            type: "upload",
            url: fileUrl,
            title,
            songId: song?.id || null,
            lyricOffsetKey,
            lyricOffsetSeconds: savedLyricOffset(lyricOffsetKey),
            requestId,
            visualUrl,
            lyricCues: Array.isArray(song?.lyricCues) ? song.lyricCues : [],
            timingReferenceDuration: song?.timingReferenceDuration || null
        };
        state.cleared = false;
        stopYouTubeProgressTimer();
        if (youtubeApiPlayer) youtubeApiPlayer.stopVideo();
        else youtubePlayer.src = "";
        youtubePlayer.hidden = true;
        startAmbientFootage(visualUrl);
        localPlayer.src = fileUrl;
        localPlayer.hidden = true;
        idleScreen.hidden = true;
        stopStaticAnimation();
        localPlayer.volume = Number(videoVolume.value) / 100;
        localPlayer.playbackRate = 1;
        playbackSpeed.value = "1";
        localPlayer.load();
        localPlayer.play().catch(() => {});
        cdDeckOverride = null;
        updatePlaybackControls();
        updatePlayback("play", 0);
    }

    function playYouTubeVideo(videoId, title, song = null) {
        const requestId = ++playbackRequestId;
        lyricsSyncControls.open = false;
        crtScreen.classList.add("has-youtube-video");
        crtScreen.classList.remove("has-ambient-visual");
        stopAmbientFootage();
        stopYouTubeProgressTimer();
        localPlayer.pause();
        localPlayer.removeAttribute("src");
        localPlayer.load();
        localPlayer.hidden = true;
        idleScreen.hidden = true;
        stopStaticAnimation();
        youtubePlayer.hidden = false;
        currentSong.textContent = title;
        const lyricOffsetKey = song?.id ? `song:${song.id}` : `video:${videoId}`;
        state.source = {
            type: "youtube", videoId, title,
            songId: song?.id || null,
            lyricOffsetKey,
            lyricOffsetSeconds: savedLyricOffset(lyricOffsetKey),
            lyricCues: Array.isArray(song?.lyricCues) ? song.lyricCues : [],
            timingReferenceDuration: song?.timingReferenceDuration || null
        };
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
                        onError: (event) => {
                            if (markYouTubeVideoUnavailable(videoId)) return;
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
        crtScreen.classList.remove("has-youtube-video");
        crtScreen.classList.remove("has-ambient-visual");
        stopAmbientFootage();
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

        if (!uploadButton.disabled) uploadButton.textContent = "Add to Song Library";

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
                showMessage("The song could not start. Press play again to retry.", "error");
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
    localPlayer.addEventListener("error", () => {
        const source = state.source;
        if (source?.type !== "upload" || state.cleared || source.requestId !== playbackRequestId) return;
        if (markLocalSongUnavailable(source.songId, source.requestId)) return;
        updatePlaybackControls(false);
        showMessage(`${source.title || "This song"} could not be played. Try a different audio file or a video that has sound.`, "error");
    });
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
        if (state.source?.type !== "upload" || state.cleared) return;
        if (playNextQueuedSong()) return;
        updatePlaybackControls(false);
        updatePlayback("pause", localPlayer.currentTime);
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
