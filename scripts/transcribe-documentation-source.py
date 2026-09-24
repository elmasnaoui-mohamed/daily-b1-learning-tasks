import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

import imageio_ffmpeg
import psutil
from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parent.parent
CACHE_ROOT = ROOT / ".cache"
AUDIO_DIRECTORY = CACHE_ROOT / "transcription-audio"
SOURCE_DIRECTORY = CACHE_ROOT / "documentation-sources"
MODEL_DIRECTORY = CACHE_ROOT / "transcription-models"


def parse_args():
    parser = argparse.ArgumentParser(description="Transcribe one exact lesson video into an ignored normalized source file.")
    parser.add_argument("level", choices=["A1", "A2", "B1", "B2"])
    parser.add_argument("lesson_id", type=int)
    parser.add_argument("--model", default="medium")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--keep-audio", action="store_true")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def video_id(url):
    from urllib.parse import parse_qs, urlparse

    parsed = urlparse(url)
    if "youtu.be" in parsed.hostname:
        return parsed.path.lstrip("/").split("/")[0]
    return parse_qs(parsed.query).get("v", [""])[0]


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_path, path)


def load_lesson(level, lesson_id):
    source_path = ROOT / "src" / "data" / f"{level.lower()}Lessons.json"
    lessons = json.loads(source_path.read_text(encoding="utf-8"))["lessons"]
    lesson = next((item for item in lessons if item["id"] == lesson_id), None)
    if lesson is None:
        raise RuntimeError(f"Lesson {level}/{lesson_id} was not found")
    return lesson


def download_audio(lesson, deterministic_stem):
    AUDIO_DIRECTORY.mkdir(parents=True, exist_ok=True)
    expected_path = AUDIO_DIRECTORY / f"{deterministic_stem}.wav"
    if expected_path.exists() and expected_path.stat().st_size > 100_000:
        return expected_path, False

    output_template = str(AUDIO_DIRECTORY / f"{deterministic_stem}.%(ext)s")
    command = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--no-playlist",
        "--force-ipv4",
        "--no-write-info-json",
        "--no-write-thumbnail",
        "-f",
        "bestaudio/best",
        "-x",
        "--audio-format",
        "wav",
        "--audio-quality",
        "0",
        "--ffmpeg-location",
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-o",
        output_template,
        lesson["url"],
    ]
    node_runtime = shutil.which("node")
    if node_runtime:
        command[3:3] = ["--js-runtimes", f"node:{node_runtime}"]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=900)
    if result.returncode != 0 or not expected_path.exists():
        message = (result.stderr or result.stdout or "yt-dlp did not produce audio").strip()
        raise RuntimeError(message[-3000:])
    return expected_path, True


class PeakMemoryMonitor:
    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self.peak_bytes = self.process.memory_info().rss
        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._measure, daemon=True)
        self.thread.start()

    def _measure(self):
        while self.running:
            try:
                self.peak_bytes = max(self.peak_bytes, self.process.memory_info().rss)
            except psutil.Error:
                pass
            time.sleep(0.2)

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)


def serialize_word(word):
    return {
        "start_seconds": round(float(word.start), 3),
        "end_seconds": round(float(word.end), 3),
        "text": word.word,
        "probability": round(float(word.probability), 4),
    }


def main():
    args = parse_args()
    lesson = load_lesson(args.level, args.lesson_id)
    exact_video_id = video_id(lesson["url"])
    deterministic_stem = f"{args.level}-{args.lesson_id}-{exact_video_id}"
    output_path = SOURCE_DIRECTORY / f"{deterministic_stem}-{args.model}.transcription.json"
    failure_path = SOURCE_DIRECTORY / f"{deterministic_stem}-{args.model}.failure.json"

    if output_path.exists() and not args.force:
        existing = json.loads(output_path.read_text(encoding="utf-8"))
        if existing.get("video_id") == exact_video_id and existing.get("segments"):
            print(json.dumps({"status": "skipped_validated", "output": str(output_path)}, indent=2))
            return

    audio_path = None
    monitor = PeakMemoryMonitor()
    started = time.perf_counter()
    try:
        audio_path, downloaded = download_audio(lesson, deterministic_stem)
        model_started = time.perf_counter()
        monitor.start()
        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type=args.compute_type,
            download_root=str(MODEL_DIRECTORY),
            local_files_only=(MODEL_DIRECTORY / f"models--Systran--faster-whisper-{args.model}").exists(),
        )
        load_seconds = time.perf_counter() - model_started
        transcription_started = time.perf_counter()
        prompt = (
            "هذا درس لتعليم اللغة الألمانية للناطقين بالعربية. "
            "اكتب الكلام العربي بالعربية، وحافظ على الكلمات والجمل والأمثلة الألمانية بالألمانية. "
            f"موضوع الدرس: {lesson['title']} — {lesson['focus']}."
        )
        segments_iterator, info = model.transcribe(
            str(audio_path),
            beam_size=5,
            best_of=5,
            language=None,
            task="transcribe",
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            word_timestamps=True,
            condition_on_previous_text=True,
            initial_prompt=prompt,
        )
        segments = []
        for segment in segments_iterator:
            text = segment.text.strip()
            if not text:
                continue
            segments.append({
                "start_seconds": round(float(segment.start), 3),
                "end_seconds": round(float(segment.end), 3),
                "text": text,
                "average_log_probability": round(float(segment.avg_logprob), 4),
                "no_speech_probability": round(float(segment.no_speech_prob), 4),
                "words": [serialize_word(word) for word in (segment.words or [])],
            })
        transcription_seconds = time.perf_counter() - transcription_started
        monitor.stop()
        duration_seconds = round(float(info.duration), 3)
        last_end = segments[-1]["end_seconds"] if segments else 0
        first_start = segments[0]["start_seconds"] if segments else duration_seconds
        covered_seconds = max(0, last_end - first_start)
        coverage_percent = round(min(100, covered_seconds / duration_seconds * 100), 1) if duration_seconds else 0
        normalized = {
            "level": args.level,
            "lesson_id": args.lesson_id,
            "video_id": exact_video_id,
            "language": info.language,
            "language_probability": round(float(info.language_probability), 4),
            "source_type": "audio_transcription",
            "model": args.model,
            "device": args.device,
            "compute_type": args.compute_type,
            "duration_seconds": duration_seconds,
            "coverage_percent": coverage_percent,
            "meaningful_segment_count": len(segments),
            "beginning_represented": first_start <= max(45, duration_seconds * 0.08),
            "middle_represented": any(segment["start_seconds"] <= duration_seconds * 0.55 and segment["end_seconds"] >= duration_seconds * 0.45 for segment in segments),
            "end_represented": last_end >= duration_seconds * 0.85,
            "metrics": {
                "model_load_seconds": round(load_seconds, 2),
                "transcription_seconds": round(transcription_seconds, 2),
                "total_pipeline_seconds": round(time.perf_counter() - started, 2),
                "real_time_factor": round(transcription_seconds / duration_seconds, 3) if duration_seconds else None,
                "peak_process_memory_mb": round(monitor.peak_bytes / 1024 / 1024, 1),
                "audio_was_downloaded": downloaded,
            },
            "segments": segments,
        }
        if not segments or coverage_percent < 80:
            raise RuntimeError(f"Transcription coverage is insufficient: {coverage_percent}%")
        atomic_json(output_path, normalized)
        if failure_path.exists():
            failure_path.unlink()
        if not args.keep_audio and audio_path.exists():
            audio_path.unlink()
        print(json.dumps({
            "status": "completed",
            "output": str(output_path),
            "model": args.model,
            "duration_seconds": duration_seconds,
            "transcription_seconds": normalized["metrics"]["transcription_seconds"],
            "real_time_factor": normalized["metrics"]["real_time_factor"],
            "peak_process_memory_mb": normalized["metrics"]["peak_process_memory_mb"],
            "coverage_percent": coverage_percent,
            "segments": len(segments),
            "audio_removed": not args.keep_audio,
        }, indent=2))
    except Exception as error:
        monitor.stop()
        atomic_json(failure_path, {
            "level": args.level,
            "lesson_id": args.lesson_id,
            "video_id": exact_video_id,
            "model": args.model,
            "device": args.device,
            "compute_type": args.compute_type,
            "status": "failed",
            "error": str(error),
            "elapsed_seconds": round(time.perf_counter() - started, 2),
            "audio_retained_for_resume": bool(audio_path and audio_path.exists()),
        })
        raise


if __name__ == "__main__":
    main()
