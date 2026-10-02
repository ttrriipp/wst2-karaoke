"""Local file-queue worker for creating karaoke MP4 and instrumental MP3 files."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from collections import deque
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
JOBS = ROOT / ".karaoke_jobs"
HEARTBEAT = JOBS / ".worker-heartbeat"
POLL_SECONDS = 2
MAX_DURATION_SECONDS = 30 * 60


def write_status(job_dir: Path, status: str, stage: str, progress: int, **extra: Any) -> None:
    payload = {
        "success": True,
        "job": job_dir.name,
        "status": status,
        "stage": stage,
        "progress": max(0, min(100, int(progress))),
        "updatedAt": int(time.time()),
        **extra,
    }
    temporary = job_dir / "status.tmp"
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, job_dir / "status.json")


def run_command(command: list[str], cwd: Path, on_progress: Any = None) -> str:
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
    except FileNotFoundError as error:
        raise RuntimeError(f"Could not start {command[0]}. Check the worker setup and PATH.") from error

    output_lines: deque[str] = deque(maxlen=200)
    if process.stdout is not None:
        for line in process.stdout:
            output_lines.append(line)
            if on_progress is not None:
                on_progress(line)
    return_code = process.wait()
    output = "".join(output_lines)

    if return_code != 0:
        detail = output.strip().splitlines()
        detail = "\n".join(detail[-8:])
        if "ffmpeg" in command[0].lower() or "ffprobe" in command[0].lower():
            detail = "FFmpeg could not process this media file. " + detail
        raise RuntimeError(detail or f"{Path(command[0]).name} stopped with an error.")
    return output


def command_progress(
    job_dir: Path,
    title: str,
    stage: str,
    start: int,
    end: int,
) -> Any:
    last_progress = start

    def update(output: str) -> None:
        nonlocal last_progress
        matches = re.findall(r"(?<!\d)(\d{1,3})%", output)
        if not matches:
            return
        fraction = min(100, max(0, int(matches[-1])))
        progress = start + (end - start) * fraction // 100
        if progress > last_progress:
            write_status(job_dir, "processing", stage, progress, title=title)
            last_progress = progress

    return update


def ffmpeg_program(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError("FFmpeg was not found. Install FFmpeg and add its bin folder to PATH.")
    return found


def safe_text(value: Any) -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = text.replace("{", "(").replace("}", ")").replace("\\", "")
    return " ".join(text.split()).strip()


def read_media_info(source: Path, ffprobe: str, job_dir: Path) -> tuple[float, bool]:
    output = run_command(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,duration",
            "-of",
            "json",
            str(source),
        ],
        job_dir,
    )
    try:
        info = json.loads(output)
    except json.JSONDecodeError as error:
        raise RuntimeError("FFprobe could not read the uploaded media file.") from error

    streams = info.get("streams", [])
    has_video = any(stream.get("codec_type") == "video" for stream in streams)
    duration_value = (info.get("format") or {}).get("duration")
    if duration_value is None:
        durations = [stream.get("duration") for stream in streams if stream.get("duration")]
        duration_value = max(durations, default=0)
    try:
        duration = float(duration_value)
    except (TypeError, ValueError):
        duration = 0
    if duration <= 0:
        raise RuntimeError("Could not read the media duration. Try another audio or video file.")
    if duration > MAX_DURATION_SECONDS:
        raise RuntimeError("Tracks longer than 30 minutes are not supported yet.")
    return duration, has_video


def get_transcription_device() -> tuple[str, str]:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def timed_words(transcription: dict[str, Any], duration: float) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    segments = transcription.get("segments") or []
    for segment in segments:
        segment_start = max(0.0, float(segment.get("start", 0) or 0))
        segment_end = min(duration, float(segment.get("end", segment_start) or segment_start))
        raw_words = segment.get("words") or []
        segment_words: list[dict[str, Any]] = []

        for item in raw_words:
            word = safe_text(item.get("word", ""))
            try:
                start = max(0.0, float(item.get("start", segment_start)))
                end = min(duration, float(item.get("end", start)))
            except (TypeError, ValueError):
                continue
            if word and end > start:
                segment_words.append({"word": word, "start": start, "end": end})

        if not segment_words:
            tokens = safe_text(segment.get("text", "")).split()
            if tokens and segment_end > segment_start:
                weights = [max(1, len(token)) for token in tokens]
                total_weight = sum(weights)
                cursor = segment_start
                span = segment_end - segment_start
                for token, weight in zip(tokens, weights):
                    token_end = min(segment_end, cursor + span * weight / total_weight)
                    if token_end > cursor:
                        segment_words.append({"word": token, "start": cursor, "end": token_end})
                    cursor = token_end

        words.extend(segment_words)

    words.sort(key=lambda item: (item["start"], item["end"]))
    return words


def align_supplied_lyrics(
    audio_path: Path,
    lyrics: str,
    language: str,
    device: str,
    duration: float,
) -> list[dict[str, Any]]:
    import whisperx

    normalized_lyrics = " ".join(lyrics.split())
    try:
        audio = whisperx.load_audio(str(audio_path))
        align_model, metadata = whisperx.load_align_model(language_code=language, device=device)
        aligned = whisperx.align(
            [{"start": 0.0, "end": duration, "text": normalized_lyrics}],
            align_model,
            metadata,
            audio,
            device,
            return_char_alignments=False,
        )
    except Exception as error:
        raise RuntimeError(
            "Could not time the supplied lyrics. Use the original recording with clear vocals, "
            "or leave the lyrics field blank to use automatic recognition."
        ) from error

    aligned_segments = aligned.get("segments") or []
    aligned_word_count = sum(
        1
        for segment in aligned_segments
        for word in (segment.get("words") or [])
        if word.get("start") is not None and word.get("end") is not None
    )
    expected_word_count = len(normalized_lyrics.split())
    minimum_aligned_words = max(3, int(expected_word_count * 0.35))
    if aligned_word_count < minimum_aligned_words:
        raise RuntimeError(
            "Too few supplied lyric words matched the audio. Upload the original recording with audible vocals."
        )

    words = timed_words(aligned, duration)
    if not words:
        raise RuntimeError("No lyric words could be timed against the vocal track.")
    return words


def lyric_groups(words: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    groups: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    char_count = 0

    for index, word in enumerate(words):
        if current:
            previous = current[-1]
            gap = word["start"] - previous["end"]
            previous_has_pause = bool(re.search(r"[.!?]$", previous["word"]))
            if gap > 0.55 or previous_has_pause or len(current) >= 7 or char_count + len(word["word"]) > 44:
                groups.append(current)
                current = []
                char_count = 0

        current.append(word)
        char_count += len(word["word"]) + 1

        if index == len(words) - 1 and current:
            groups.append(current)

    return groups


def ass_time(seconds: float) -> str:
    total_cs = max(0, round(seconds * 100))
    hours, remainder = divmod(total_cs, 360000)
    minutes, remainder = divmod(remainder, 6000)
    whole_seconds, centiseconds = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{whole_seconds:02d}.{centiseconds:02d}"


def make_ass_file(words: list[dict[str, Any]], job_dir: Path) -> Path:
    if not words:
        raise RuntimeError(
            "No lyrics were detected. Upload the original song with audible vocals, or paste verified lyrics before starting."
        )

    header = """[Script Info]
ScriptType: v4.00+
WrapStyle: 2
ScaledBorderAndShadow: yes
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H0000D7FF,&H00F2E6D7,&HCC090604,&H96090604,-1,0,0,0,100,100,0,0,1,4,2,2,70,70,160,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for group in lyric_groups(words):
        start = group[0]["start"]
        end = max(start + 0.2, group[-1]["end"])
        karaoke_text: list[str] = []
        for index, word in enumerate(group):
            if index + 1 < len(group):
                next_start = group[index + 1]["start"]
                word_span = max(0.01, next_start - word["start"])
            else:
                word_span = max(0.01, word["end"] - word["start"])
            duration_cs = max(1, round(word_span * 100))
            karaoke_text.append(f"{{\\k{duration_cs}}}{word['word']}")

        line_text = " ".join(karaoke_text)
        lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Default,,0,0,0,,{line_text}\n")

    subtitle_path = job_dir / "karaoke.ass"
    subtitle_path.write_text("".join(lines), encoding="utf-8-sig")
    return subtitle_path


def render_outputs(
    source: Path,
    has_video: bool,
    instrumental: Path,
    duration: float,
    job_dir: Path,
    ffmpeg: str,
) -> None:
    mp3_path = job_dir / "instrumental.mp3"
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-nostdin",
            "-y",
            "-i",
            str(instrumental),
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(mp3_path),
        ],
        job_dir,
    )

    video_path = job_dir / "karaoke.mp4"
    common = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y"]
    if has_video:
        command = common + [
            "-i",
            str(source),
            "-i",
            str(instrumental),
            "-vf",
            "subtitles=filename=karaoke.ass",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(video_path),
        ]
    else:
        command = common + [
            "-f",
            "lavfi",
            "-i",
            "color=c=0x140d09:s=1280x720:r=30",
            "-i",
            str(instrumental),
            "-vf",
            "subtitles=filename=karaoke.ass",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-t",
            f"{duration:.3f}",
            "-shortest",
            "-movflags",
            "+faststart",
            str(video_path),
        ]
    run_command(command, job_dir)


def remove_successful_job_intermediates(job_dir: Path) -> None:
    for source in job_dir.glob("source.*"):
        source.unlink(missing_ok=True)
    for name in ("karaoke_source.wav", "karaoke.ass", "lyrics.txt"):
        (job_dir / name).unlink(missing_ok=True)
    for name in ("stems", "transcription"):
        path = job_dir / name
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)


def process_job(job_dir: Path) -> None:
    if not re.fullmatch(r"[a-f0-9]{32}", job_dir.name):
        return

    status_path = job_dir / "status.json"
    try:
        status = json.loads(status_path.read_text(encoding="utf-8"))
        source_files = list(job_dir.glob("source.*"))
        if not source_files:
            raise RuntimeError("The uploaded media file is missing from this job.")
        source = source_files[0]
        title = str(status.get("title") or "Karaoke track")
        lyrics_path = job_dir / "lyrics.txt"
        supplied_lyrics = lyrics_path.read_text(encoding="utf-8").strip() if lyrics_path.is_file() else ""

        ffmpeg = ffmpeg_program("ffmpeg")
        ffprobe = ffmpeg_program("ffprobe")
        duration, has_video = read_media_info(source, ffprobe, job_dir)
        device, compute_type = get_transcription_device()
        cpu_count = os.cpu_count() or 1
        demucs_jobs = min(2, cpu_count) if device == "cpu" and cpu_count > 1 else 0
        separator_model = os.environ.get("KARAOKE_DEMUCS_MODEL", "").strip()
        if not separator_model:
            separator_model = "htdemucs"
        model = os.environ.get("KARAOKE_WHISPER_MODEL", "").strip()
        if not model:
            model = "small"

        write_status(job_dir, "processing", "Preparing the song audio", 8, title=title)
        extracted_audio = job_dir / "karaoke_source.wav"
        run_command(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-y",
                "-i",
                str(source),
                "-map",
                "0:a:0",
                "-vn",
                "-ac",
                "2",
                "-ar",
                "44100",
                "-c:a",
                "pcm_s16le",
                str(extracted_audio),
            ],
            job_dir,
        )

        write_status(job_dir, "processing", "Separating the singer from the music", 22, title=title)
        stem_output = job_dir / "stems"
        run_command(
            [
                sys.executable,
                "-m",
                "demucs",
                "-n",
                separator_model,
                "--two-stems=vocals",
                "--device",
                device,
                "--overlap",
                "0.25",
                "--jobs",
                str(demucs_jobs),
                "--out",
                str(stem_output),
                str(extracted_audio),
            ],
            job_dir,
            on_progress=command_progress(
                job_dir,
                title,
                "Separating the singer from the music",
                22,
                47,
            ),
        )

        stem_directory = stem_output / separator_model / extracted_audio.stem
        vocals = stem_directory / "vocals.wav"
        instrumental = stem_directory / "no_vocals.wav"
        if not vocals.is_file() or not instrumental.is_file():
            raise RuntimeError("The audio separator did not produce vocal and instrumental tracks.")

        write_status(job_dir, "processing", "Listening for and timing the lyrics", 48, title=title)
        transcription_output = job_dir / "transcription"
        transcription_output.mkdir(exist_ok=True)
        whisper_command = [
            sys.executable,
            "-m",
            "whisperx",
            str(vocals),
            "--model",
            model,
            "--device",
            device,
            "--compute_type",
            compute_type,
            "--output_dir",
            str(transcription_output),
            "--output_format",
            "json",
        ]
        if supplied_lyrics:
            whisper_command.append("--no_align")
        run_command(
            whisper_command,
            job_dir,
            on_progress=command_progress(
                job_dir,
                title,
                "Listening for and timing the lyrics",
                48,
                64 if supplied_lyrics else 75,
            ),
        )

        json_files = sorted(transcription_output.glob("*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not json_files:
            raise RuntimeError("The lyric recognizer did not return a transcript.")
        transcription = json.loads(json_files[0].read_text(encoding="utf-8"))
        if supplied_lyrics:
            language = str(transcription.get("language") or "en")
            write_status(job_dir, "processing", "Timing the lyrics you supplied", 68, title=title)
            words = align_supplied_lyrics(vocals, supplied_lyrics, language, device, duration)
        else:
            words = timed_words(transcription, duration)
            if len(words) < 3:
                raise RuntimeError(
                    "I couldn't recognize enough lyrics. Upload the original song with audible vocals, or paste verified lyrics before starting."
                )
        subtitle_path = make_ass_file(words, job_dir)

        write_status(job_dir, "processing", "Rendering the karaoke MP4 and instrumental MP3", 76, title=title)
        render_outputs(source, has_video, instrumental, duration, job_dir, ffmpeg)
        remove_successful_job_intermediates(job_dir)

        write_status(
            job_dir,
            "complete",
            "Karaoke files are ready",
            100,
            title=title,
            message=f"Timed {len(words)} lyric words.",
            videoReady=(job_dir / "karaoke.mp4").is_file(),
            audioReady=(job_dir / "instrumental.mp3").is_file(),
        )
        print(f"Finished karaoke job {job_dir.name}: {title}", flush=True)
    except Exception as error:
        message = str(error).strip() or "The karaoke job could not be completed."
        if len(message) > 1400:
            message = message[-1400:]
        try:
            current_status = json.loads(status_path.read_text(encoding="utf-8"))
            title = str(current_status.get("title") or "Karaoke track")
        except Exception:
            title = "Karaoke track"
        write_status(job_dir, "failed", "Karaoke creation stopped", 100, title=title, message=message)
        print(f"Karaoke job {job_dir.name} failed: {message}", flush=True)


def claim_next_job() -> Path | None:
    if not JOBS.is_dir():
        JOBS.mkdir(parents=True, exist_ok=True)
    pattern = "/".join(["[a-f0-9]" * 32, "queued.flag"])
    for queued in JOBS.glob(pattern):
        running = queued.with_name("running.flag")
        try:
            queued.rename(running)
            return queued.parent
        except FileNotFoundError:
            continue
        except OSError:
            continue
    return None


def recover_interrupted_jobs() -> None:
    pattern = "/".join(["[a-f0-9]" * 32, "running.flag"])
    for running in JOBS.glob(pattern):
        job_dir = running.parent
        try:
            status_path = job_dir / "status.json"
            status = json.loads(status_path.read_text(encoding="utf-8"))
            if status.get("status") == "processing":
                for name in ("karaoke_source.wav", "karaoke.ass", "instrumental.mp3", "karaoke.mp4"):
                    (job_dir / name).unlink(missing_ok=True)
                for name in ("stems", "transcription"):
                    path = job_dir / name
                    if path.is_dir():
                        shutil.rmtree(path, ignore_errors=True)
                write_status(
                    job_dir,
                    "queued",
                    "Resuming this song after the worker restarted",
                    0,
                    title=str(status.get("title") or "Karaoke track"),
                    message="The previous worker stopped. This job will restart from the beginning.",
                )
                running.rename(job_dir / "queued.flag")
            elif status.get("status") not in ("complete", "failed"):
                running.rename(job_dir / "queued.flag")
            else:
                running.unlink(missing_ok=True)
        except (OSError, json.JSONDecodeError):
            continue


def main() -> None:
    JOBS.mkdir(parents=True, exist_ok=True)
    existing_heartbeat = HEARTBEAT.is_file() and (time.time() - HEARTBEAT.stat().st_mtime) <= 30
    if not existing_heartbeat:
        recover_interrupted_jobs()
    print("Karaokur local karaoke worker is running. Keep this window open.", flush=True)
    try:
        while True:
            try:
                HEARTBEAT.touch()
            except OSError:
                pass
            job_dir = claim_next_job()
            if job_dir:
                process_job(job_dir)
                continue
            time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        print("Karaokur worker stopped.", flush=True)
    finally:
        try:
            HEARTBEAT.unlink(missing_ok=True)
        except OSError:
            pass


if __name__ == "__main__":
    main()
