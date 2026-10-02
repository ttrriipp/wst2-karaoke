# Karaokur — XAMPP setup

## Install

1. Stop Apache in the XAMPP Control Panel.
2. Keep a backup of your existing `C:\xampp\htdocs\wst2-karaoke` folder.
3. Copy the contents of this folder into `C:\xampp\htdocs\wst2-karaoke`.
4. Start Apache.
5. Open `http://localhost/wst2-karaoke/` in Chrome, Edge, or Firefox.

No database is required.

## Microphone and audio settings

- Click **Enable Mic** and allow microphone access in the browser.
- **Microphone volume** controls the live mic level from 0% to 200%.
- **Microphone echo** controls a short delay/feedback effect.
- **Video volume** controls uploaded videos and YouTube players.
- The mic plays through the computer's currently selected Windows audio output. Select the TV/HDMI or speaker output in Windows if needed.
- Use headphones or keep the microphone away from the speakers to avoid feedback.

Browser microphone access works on `localhost`. It will usually be blocked if the site is opened from another computer over plain HTTP.

## Add songs

- Open **Add Song** and choose **YouTube link**. Paste the link and lyrics with one sung line per line. Karaokur reads the video title, looks for matching timed lines in LRCLIB, and saves the entry only when every supplied line matches in order. **Song details** lets you enter the title and artist if the video title is unclear. This requires an internet connection and a song with synced lyrics in LRCLIB.
- The lyrics appear beside the YouTube video and advance automatically using the embedded player's playback time. The timings come from a matched song recording, so another arrangement or karaoke version may be out of sync. Karaokur warns when the video length differs substantially from that recording.
- Choose **Audio or video file** in the same form to add a file from your computer. Uploaded MP4, WebM, OGG, MP3, WAV, and M4A files use `upload.php` and the existing `uploads` folder.
- YouTube watch, `youtu.be`, Shorts, Live, and embed links are checked by `validate_youtube.php`. The owner must allow embedding for the video to play inside the site.

## Large uploads

If a large video fails before the page can process it, open `php.ini` from the Apache row in XAMPP Control Panel and increase these values, for example:

```ini
upload_max_filesize=500M
post_max_size=520M
max_execution_time=300
```

Save the file and restart Apache. Only expose this local upload app to people you trust.

## Local processor files

The Python, FFmpeg, Demucs, and WhisperX files remain in the folder from an earlier processing flow. The Add Song form does not use that worker. YouTube songs are timed through LRCLIB matching and play in the YouTube player; audio and video file entries play directly.

## Browser notes

- Some browsers require a click before they allow sound to autoplay.
