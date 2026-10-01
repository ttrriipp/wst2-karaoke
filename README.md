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

## Video sources

- Uploaded MP4, WebM, and OGG playback continues to use `upload.php` and the existing `uploads` folder.
- YouTube watch, `youtu.be`, Shorts, Live, and embed links continue to be checked by `validate_youtube.php`.
- YouTube playback requires an internet connection.

## Large uploads

If a large video fails before the page can process it, open `php.ini` from the Apache row in XAMPP Control Panel and increase these values, for example:

```ini
upload_max_filesize=500M
post_max_size=520M
max_execution_time=300
```

Save the file and restart Apache. Only expose this local upload app to people you trust.

## Browser notes

- Some browsers require a click before they allow sound to autoplay.
