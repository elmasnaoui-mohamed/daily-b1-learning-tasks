"""Prepare cache-only audio/visual evidence for one public YouTube lesson.

This script never reads browser cookies. It prepares evidence; it does not mark the
lesson verified. A reviewer must inspect the full timeline and promote the manifest.
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "documentation-sources"


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("level", choices=["A1", "A2", "B1", "B2"])
    parser.add_argument("lesson_id", type=int)
    parser.add_argument("--interval", type=float, default=5.0)
    parser.add_argument("--scene-threshold", type=float, default=0.22)
    parser.add_argument("--transcribe", action="store_true")
    parser.add_argument("--ocr", action="store_true")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def run(command, *, timeout=1800, capture=True):
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=capture,
        timeout=timeout,
        check=False,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout or "command failed")[-4000:]
        raise RuntimeError(f"Command failed ({result.returncode}): {detail}")
    return result


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def lesson_for(level, lesson_id):
    lesson_file = ROOT / "src" / "data" / f"{level.lower()}Lessons.json"
    source = json.loads(lesson_file.read_text(encoding="utf-8"))
    lesson = next((item for item in source["lessons"] if int(item["id"]) == lesson_id), None)
    if lesson is None:
        raise RuntimeError(f"{level}/{lesson_id}: lesson does not exist")
    return lesson


def video_id(url):
    from urllib.parse import parse_qs, urlparse

    parsed = urlparse(url)
    if "youtu.be" in parsed.netloc:
        return parsed.path.strip("/").split("/")[0]
    return parse_qs(parsed.query).get("v", [""])[0]


def download_sources(lesson, target, force):
    video = target / "video.mp4"
    audio = target / "audio.m4a"
    info = target / "source.info.json"
    ytdlp = [sys.executable, "-m", "yt_dlp", "--no-playlist", "--no-cookies-from-browser"]
    node = shutil.which("node")
    if node:
        ytdlp += ["--js-runtimes", f"node:{node}"]
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    if force or not video.exists() or video.stat().st_size < 1_000_000:
        run(ytdlp + [
            "--ffmpeg-location", ffmpeg,
            "--write-info-json",
            "--write-auto-subs",
            "--write-subs",
            "--sub-langs", "ar-orig,ar,de",
            "--sub-format", "json3",
            "-f", "bv*[height<=1080]+ba/b[height<=1080]",
            "--merge-output-format", "mp4",
            "-o", str(target / "source.%(ext)s"),
            lesson["url"],
        ])
        produced = target / "source.mp4"
        if produced.exists():
            os.replace(produced, video)
        produced_info = target / "source.info.json"
        if not produced_info.exists():
            raise RuntimeError("yt-dlp did not create source.info.json")

    if force or not audio.exists() or audio.stat().st_size < 100_000:
        run(ytdlp + [
            "--ffmpeg-location", ffmpeg,
            "-f", "bestaudio[ext=m4a]/bestaudio",
            "-o", str(target / "audio.%(ext)s"),
            lesson["url"],
        ])
        candidates = sorted(target.glob("audio.*"))
        if not candidates:
            raise RuntimeError("yt-dlp did not create audio")
        if candidates[0] != audio:
            run([ffmpeg, "-y", "-i", str(candidates[0]), "-vn", "-c:a", "aac", str(audio)])
    return video, audio, info


def extract_frames(video, target, interval, scene_threshold, force):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    periodic = target / "frames-periodic"
    scenes = target / "frames-scenes"
    sheets = target / "contact-sheets"
    for directory in (periodic, scenes, sheets):
        directory.mkdir(parents=True, exist_ok=True)

    if force or not any(periodic.glob("periodic-*.jpg")):
        run([ffmpeg, "-y", "-i", str(video), "-vf", f"fps=1/{interval}", "-q:v", "2", str(periodic / "periodic-%04d.jpg")])
    if force or not any(scenes.glob("scene-*.jpg")):
        run([
            ffmpeg, "-y", "-i", str(video),
            "-vf", f"select='gt(scene,{scene_threshold})'",
            "-vsync", "vfr", "-q:v", "2", str(scenes / "scene-%04d.jpg"),
        ])
    if force or not any(sheets.glob("periodic-sheet-*.jpg")):
        run([
            ffmpeg, "-y", "-i", str(video),
            "-vf", f"fps=1/{interval},scale=360:-2,tile=5x4:padding=4:margin=4",
            "-vsync", "vfr", "-q:v", "3", str(sheets / "periodic-sheet-%02d.jpg"),
        ])
    return periodic, scenes, sheets


def ocr_discovery(periodic, scenes, target, enabled):
    output = target / "ocr-discovery.json"
    if not enabled:
        return {"status": "not_requested", "path": None}
    tesseract = shutil.which("tesseract")
    if not tesseract:
        return {"status": "unavailable", "path": None}
    rows = []
    for frame in [*sorted(scenes.glob("*.jpg")), *sorted(periodic.glob("*.jpg"))]:
        result = run([tesseract, str(frame), "stdout", "-l", "deu+ara"], timeout=120)
        text = result.stdout.strip()
        if text:
            rows.append({"frame": frame.relative_to(target).as_posix(), "text": text, "review_status": "discovery_only_unverified"})
    atomic_json(output, {"warning": "OCR is discovery-only and requires visual verification.", "items": rows})
    return {"status": "discovery_only_unverified", "path": output.relative_to(ROOT).as_posix()}


def main():
    args = arguments()
    lesson = lesson_for(args.level, args.lesson_id)
    identity = video_id(lesson["url"])
    target = CACHE / f"{args.level}-{args.lesson_id}-{identity}-visual"
    target.mkdir(parents=True, exist_ok=True)
    manifest_path = target / "manifest.json"

    existing = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else None
    if existing and not args.force and existing.get("stage") == "prepared" and existing.get("source_url") == lesson["url"]:
        print(json.dumps({"status": "cached", "manifest": str(manifest_path)}, indent=2))
        return

    video, audio, info = download_sources(lesson, target, args.force)
    periodic, scenes, sheets = extract_frames(video, target, args.interval, args.scene_threshold, args.force)
    ocr = ocr_discovery(periodic, scenes, target, args.ocr)
    metadata = json.loads(info.read_text(encoding="utf-8"))

    transcript = CACHE / f"{args.level}-{args.lesson_id}-{identity}-medium.transcription.json"
    if args.transcribe and not transcript.exists():
        run([
            sys.executable,
            str(ROOT / "scripts" / "transcribe-documentation-source.py"),
            args.level,
            str(args.lesson_id),
            "--model", "medium",
            "--compute-type", "int8",
            "--device", "cpu",
            "--keep-audio",
        ], timeout=7200, capture=False)

    captions = sorted(target.glob("source.*.json3"))
    manifest = {
        "schema_version": 1,
        "stage": "prepared",
        "level": args.level,
        "lesson_id": args.lesson_id,
        "video_id": identity,
        "source_url": lesson["url"],
        "duration_seconds": metadata.get("duration"),
        "periodic_interval_seconds": args.interval,
        "scene_threshold": args.scene_threshold,
        "periodic_frame_count": len(list(periodic.glob("periodic-*.jpg"))),
        "scene_frame_count": len(list(scenes.glob("scene-*.jpg"))),
        "contact_sheet_count": len(list(sheets.glob("periodic-sheet-*.jpg"))),
        "caption_files": [item.relative_to(ROOT).as_posix() for item in captions],
        "transcript": transcript.relative_to(ROOT).as_posix() if transcript.exists() else None,
        "ocr": ocr,
        "hashes": {
            "video_sha256": sha256(video),
            "audio_sha256": sha256(audio),
            **({"transcript_sha256": sha256(transcript)} if transcript.exists() else {}),
        },
        "review": {
            "visual_review_status": "pending",
            "audio_review_status": "pending",
            "overall_review_status": "pending",
            "note": "Preparation does not imply semantic completeness. Review every contact sheet and original frame before publishing.",
        },
        "cookie_accessed": False,
    }
    atomic_json(manifest_path, manifest)
    print(json.dumps({"status": "prepared", "manifest": str(manifest_path)}, indent=2))


if __name__ == "__main__":
    main()
