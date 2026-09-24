import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const captionDirectory = process.argv[2] ? path.resolve(process.argv[2]) : null;
const cacheDirectory = path.join(root, ".cache", "documentation-sources");
const levels = ["A1", "A2", "B1", "B2"];
const pilotOnly = process.argv.includes("--pilot");
const pilotIds = { A1: [1, 2, 3, 16, 40], A2: [1, 8, 20], B1: [1, 9, 13], B2: [1, 8, 14] };
const qualityOverrides = new Map([
  ["qDtqMf8LT5Q", "poor_garbled"],
  ["9M2D1eUKyZE", "poor_fragmented"],
  ["lF-dNXa9Nug", "poor_garbled"],
]);

function getVideoId(url) {
  const parsed = new URL(url);
  return parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1).split("/")[0] : parsed.searchParams.get("v") ?? "";
}

function captionText(event) {
  return (event.segs ?? []).map((segment) => segment.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
}

function normalizedSegments(data) {
  const sourceEvents = (data.events ?? []).filter((event) => captionText(event));
  return sourceEvents.map((event, index) => {
    const nextStart = sourceEvents[index + 1]?.tStartMs;
    const start = Math.max(0, Number(event.tStartMs ?? 0) / 1000);
    const explicitEnd = start + Math.max(0, Number(event.dDurationMs ?? 0) / 1000);
    const end = Number.isFinite(nextStart) ? Math.max(start, Number(nextStart) / 1000) : explicitEnd;
    return {
      start_seconds: Number(start.toFixed(3)),
      end_seconds: Number(Math.max(start, end).toFixed(3)),
      text: captionText(event),
    };
  });
}

function sourceDuration(data, segments) {
  const declared = (data.events ?? []).reduce((maximum, event) => {
    const end = (Number(event.tStartMs ?? 0) + Number(event.dDurationMs ?? 0)) / 1000;
    return Math.max(maximum, end);
  }, 0);
  return Number(Math.max(declared, segments.at(-1)?.end_seconds ?? 0).toFixed(3));
}

function textQuality(language, segments, durationSeconds, videoId) {
  const text = segments.map((segment) => segment.text).join(" ");
  const characters = [...text].filter((character) => !/\s/u.test(character));
  const expectedPattern = language === "ar" ? /\p{Script=Arabic}/u : /[A-Za-zÄÖÜäöüß]/u;
  const languageRatio = characters.length ? characters.filter((character) => expectedPattern.test(character)).length / characters.length : 0;
  const first = segments[0]?.start_seconds ?? durationSeconds;
  const last = segments.at(-1)?.end_seconds ?? 0;
  const coveredSeconds = Math.max(0, last - first);
  const coveragePercent = durationSeconds > 0 ? Math.min(100, coveredSeconds / durationSeconds * 100) : 0;
  const override = qualityOverrides.get(videoId);
  let status = "usable";
  if (override) status = override;
  else if (text.length < 500) status = "poor_too_short";
  else if (coveragePercent < 80) status = "poor_coverage";
  else if (languageRatio < 0.28) status = "poor_language_coherence";
  return {
    status,
    coverage_percent: Number(coveragePercent.toFixed(1)),
    character_count: text.length,
    language_character_ratio: Number(languageRatio.toFixed(3)),
    meaningful_segment_count: segments.length,
    beginning_represented: first <= Math.max(45, durationSeconds * 0.08),
    middle_represented: segments.some((segment) => segment.start_seconds <= durationSeconds * 0.55 && segment.end_seconds >= durationSeconds * 0.45),
    end_represented: last >= durationSeconds * 0.85,
  };
}

async function youtubeMetadata(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { "accept-language": "ar,en;q=0.8" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return { duration_seconds: null, caption_tracks: [], error: `HTTP ${response.status}` };
    const html = await response.text();
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const tracksMatch = html.match(/"captionTracks":(\[[\s\S]*?\]),"audioTracks"/);
    let tracks = [];
    if (tracksMatch) {
      try {
        tracks = JSON.parse(tracksMatch[1].replaceAll("\\u0026", "&")).map((track) => ({
          language: track.languageCode ?? null,
          kind: track.kind === "asr" ? "automatic" : "manual",
          name: track.name?.simpleText ?? track.name?.runs?.map((run) => run.text).join("") ?? "",
        }));
      } catch {
        tracks = [];
      }
    }
    return { duration_seconds: durationMatch ? Number(durationMatch[1]) : null, caption_tracks: tracks, error: null };
  } catch (error) {
    return { duration_seconds: null, caption_tracks: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function captionCandidate(videoId) {
  if (!captionDirectory) return null;
  for (const language of ["ar", "de", "en"]) {
    const file = path.join(captionDirectory, `${videoId}.${language}.json3`);
    if (!existsSync(file)) continue;
    try {
      return { language, file, data: JSON.parse(await readFile(file, "utf8")) };
    } catch {
      // Try the next candidate when a file is malformed.
    }
  }
  return null;
}

await mkdir(cacheDirectory, { recursive: true });
const manifest = [];
for (const level of levels) {
  const lessonData = JSON.parse(await readFile(path.join(root, "src", "data", `${level.toLowerCase()}Lessons.json`), "utf8"));
  const selectedLessons = pilotOnly ? lessonData.lessons.filter((lesson) => pilotIds[level].includes(lesson.id)) : lessonData.lessons;
  for (const lesson of selectedLessons) {
    const videoId = getVideoId(lesson.url);
    const metadata = await youtubeMetadata(videoId);
    const candidate = await captionCandidate(videoId);
    if (!candidate) {
      manifest.push({
        level,
        lesson_id: lesson.id,
        video_id: videoId,
        source_status: "needs_audio_transcription",
        source_type: "unavailable",
        video_duration_seconds: metadata.duration_seconds,
        acquisition_error: metadata.error,
      });
      continue;
    }

    const segments = normalizedSegments(candidate.data);
    const captionDuration = sourceDuration(candidate.data, segments);
    const durationSeconds = metadata.duration_seconds ?? captionDuration;
    const quality = textQuality(candidate.language, segments, durationSeconds, videoId);
    const track = metadata.caption_tracks.find((item) => item.language === candidate.language);
    const sourceType = track?.kind === "manual" ? "manual_captions" : "automatic_captions_verified";
    const normalized = {
      video_id: videoId,
      language: candidate.language,
      source_type: sourceType,
      duration_seconds: durationSeconds,
      caption_duration_seconds: captionDuration,
      coverage_percent: quality.coverage_percent,
      caption_character_count: quality.character_count,
      quality_status: quality.status,
      source_track_kind: track?.kind ?? "unknown",
      meaningful_segment_count: quality.meaningful_segment_count,
      beginning_represented: quality.beginning_represented,
      middle_represented: quality.middle_represented,
      end_represented: quality.end_represented,
      segments,
    };
    await writeFile(path.join(cacheDirectory, `${videoId}.json`), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    manifest.push({
      level,
      lesson_id: lesson.id,
      video_id: videoId,
      source_status: quality.status === "usable" ? "usable_captions" : "needs_audio_transcription",
      source_type: quality.status === "usable" ? sourceType : "unavailable",
      source_language: candidate.language,
      caption_track_kind: track?.kind ?? "unknown",
      video_duration_seconds: durationSeconds,
      caption_duration_seconds: captionDuration,
      coverage_percent: quality.coverage_percent,
      caption_character_count: quality.character_count,
      quality_status: quality.status,
      meaningful_segment_count: quality.meaningful_segment_count,
      beginning_represented: quality.beginning_represented,
      middle_represented: quality.middle_represented,
      end_represented: quality.end_represented,
      acquisition_error: metadata.error,
    });
  }
}

await writeFile(path.join(cacheDirectory, pilotOnly ? "pilot-manifest.json" : "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  processed: manifest.length,
  usable_captions: manifest.filter((item) => item.source_status === "usable_captions").length,
  needs_audio_transcription: manifest.filter((item) => item.source_status === "needs_audio_transcription").length,
  cache_directory: cacheDirectory,
}, null, 2));
