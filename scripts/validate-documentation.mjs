import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const levels = ["A1", "A2", "B1", "B2"];
const pilotIds = { A1: [1, 2, 3, 16, 40], A2: [1, 8, 20], B1: [1, 9, 13], B2: [1, 8, 9, 14] };
const pilotOnly = process.argv.includes("--pilot");
const sourceTypes = new Set(["manual_captions", "automatic_captions_verified", "audio_transcription", "audiovisual_verified", "unavailable"]);
const statuses = new Set(["source_verified", "source_partial", "needs_source", "needs_human_review"]);
const completed = new Set(["source_verified", "source_partial", "needs_human_review"]);
const readingRanges = { A1: [2, 20], A2: [3, 20], B1: [4, 20], B2: [5, 20] };
const errors = [];
const warnings = [];
const fingerprints = [];
const report = { scope: pilotOnly ? "pilot" : "all", total: 0, manual_captions: 0, automatic_captions_verified: 0, audio_transcription: 0, audiovisual_verified: 0, source_partial: 0, needs_source: 0, needs_human_review: 0, source_coverage: {} };
const b29Fixture = JSON.parse(await readFile(path.join(root, "scripts", "fixtures", "b2-9-evidence.json"), "utf8"));

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const videoId = (url) => {
  const parsed = new URL(url);
  return parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1).split("/")[0] : parsed.searchParams.get("v") ?? "";
};
const timestampSeconds = (value) => {
  if (Number.isFinite(value)) return Number(value);
  if (typeof value !== "string" || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) return Number.NaN;
  return value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
};
function checkTimestamp(value, duration, label) {
  const result = timestampSeconds(value);
  if (!Number.isFinite(result)) errors.push(`${label}: invalid timestamp.`);
  else if (result < 0 || result > duration) errors.push(`${label}: timestamp exceeds video duration.`);
  return result;
}
function inspectText(value, label) {
  if (typeof value === "string") {
    if (value.includes("\uFFFD") || /[\uD800-\uDFFF]/u.test(value)) errors.push(`${label}: malformed Unicode.`);
    if (value !== value.normalize("NFC")) errors.push(`${label}: text is not NFC-normalized.`);
    if (/<\/?[a-z][^>]*>/i.test(value)) errors.push(`${label}: unexpected HTML.`);
    if (/(?:[\p{Script=Arabic}][A-Za-zÄÖÜäöüß]|[A-Za-zÄÖÜäöüß][\p{Script=Arabic}])/u.test(value)) errors.push(`${label}: Arabic and German text are joined.`);
    if (value.length > 1800) errors.push(`${label}: possible raw transcript.`);
  } else if (Array.isArray(value)) value.forEach((item, index) => inspectText(item, `${label}[${index}]`));
  else if (value && typeof value === "object") {
    if (["transcript", "captions", "segments"].some((key) => Object.hasOwn(value, key))) errors.push(`${label}: raw source material is not allowed.`);
    Object.entries(value).forEach(([key, item]) => inspectText(item, `${label}.${key}`));
  }
}
function tokenSet(text) {
  return new Set(String(text).toLocaleLowerCase("ar").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/u).filter((token) => token.length > 2));
}
function similarity(left, right) {
  const a = tokenSet(left); const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}

for (const level of levels) {
  const lessons = JSON.parse(await readFile(path.join(root, "src", "data", `${level.toLowerCase()}Lessons.json`), "utf8")).lessons;
  const docs = JSON.parse(await readFile(path.join(root, "src", "data", "documentation", `${level.toLowerCase()}Documentation.json`), "utf8"));
  const counts = new Map();
  docs.forEach((entry) => counts.set(String(entry.lesson_id), (counts.get(String(entry.lesson_id)) ?? 0) + 1));
  for (const [id, count] of counts) if (count > 1) errors.push(`${level}/${id}: duplicate documentation entry.`);
  const selected = pilotOnly ? lessons.filter((lesson) => pilotIds[level].includes(Number(lesson.id))) : lessons;
  for (const lesson of selected) {
    const label = `${level}/${lesson.id}`;
    const matches = docs.filter((entry) => String(entry.lesson_id) === String(lesson.id));
    if (matches.length !== 1) { errors.push(`${label}: expected exactly one entry.`); continue; }
    const entry = matches[0]; report.total += 1;
    if (entry.level !== level || entry.video_id !== videoId(lesson.url)) errors.push(`${label}: lesson/video identity mismatch.`);
    if (!sourceTypes.has(entry.source_type)) errors.push(`${label}: completed metadata/template sources are forbidden.`);
    if (!statuses.has(entry.review_status)) errors.push(`${label}: invalid review status.`);
    if (entry.source_type === "unavailable" && entry.review_status !== "needs_source") errors.push(`${label}: unavailable must use needs_source.`);
    if (entry.review_status === "needs_source") { report.needs_source += 1; continue; }
    if (!completed.has(entry.review_status)) continue;
    report[entry.source_type] += 1;
    if (entry.review_status === "source_partial") report.source_partial += 1;
    if (entry.review_status === "needs_human_review") report.needs_human_review += 1;
    const duration = entry.source_duration_seconds;
    if (!Number.isFinite(duration) || duration <= 0) errors.push(`${label}: source duration missing.`);
    if (!Number.isFinite(entry.source_coverage_percent)) errors.push(`${label}: source coverage missing.`);
    else { report.source_coverage[label] = entry.source_coverage_percent; if (entry.review_status === "source_verified" && entry.source_coverage_percent < 90) errors.push(`${label}: verified coverage below 90%.`); }
    if (!hasText(entry.source_language)) errors.push(`${label}: source language missing.`);
    const [minReading, maxReading] = readingRanges[level];
    if (!Number.isFinite(entry.reading_time_minutes) || entry.reading_time_minutes < minReading || entry.reading_time_minutes > maxReading) errors.push(`${label}: invalid reading time.`);
    if (!hasText(entry.summary)) errors.push(`${label}: summary empty.`);
    if (!Array.isArray(entry.video_outline) || entry.video_outline.length < 3) errors.push(`${label}: real video outline required.`);
    else entry.video_outline.forEach((item, index) => { if (!hasText(item.heading) || !hasText(item.summary)) errors.push(`${label}: incomplete outline item.`); checkTimestamp(item.timestamp, duration, `${label}.outline[${index}]`); });
    if (!Array.isArray(entry.explanation) || !entry.explanation.length) errors.push(`${label}: explanation empty.`);
    else entry.explanation.forEach((item, index) => { if (!hasText(item.heading) || !hasText(item.content) || item.origin !== "video") errors.push(`${label}: invalid video explanation.`); const start = checkTimestamp(item.source_start, duration, `${label}.explanation[${index}].start`); const end = checkTimestamp(item.source_end, duration, `${label}.explanation[${index}].end`); if (start > end) errors.push(`${label}: reversed source range.`); });
    if (!Array.isArray(entry.examples_from_video)) errors.push(`${label}: examples_from_video missing.`);
    else entry.examples_from_video.forEach((item, index) => { if (!hasText(item.de) || !hasText(item.ar) || item.origin !== "video" || typeof item.verified !== "boolean") errors.push(`${label}: invalid video example.`); checkTimestamp(item.timestamp, duration, `${label}.example[${index}]`); });
    if (!Array.isArray(entry.evidence_checks) || entry.evidence_checks.filter((item) => item?.verified).length < 5) errors.push(`${label}: five verified evidence checks required.`);
    else entry.evidence_checks.forEach((item, index) => checkTimestamp(item.timestamp, duration, `${label}.evidence[${index}]`));
    if (!entry.completeness?.beginning_represented || !entry.completeness?.middle_represented || !entry.completeness?.end_represented) errors.push(`${label}: beginning, middle, and end must be represented.`);
    if (label === "A1/3") {
      if (!Array.isArray(entry.chronological_sections) || entry.chronological_sections.length < 14) errors.push(`${label}: complete chronological adaptation requires at least 14 mapped teaching sections.`);
      else entry.chronological_sections.forEach((section, index) => {
        if (!hasText(section.heading) || !Array.isArray(section.paragraphs) || !section.paragraphs.some(hasText)) errors.push(`${label}: chronological section ${index} lacks educational content.`);
        const start = checkTimestamp(section.source_start, duration, `${label}.chronological_sections[${index}].start`);
        const end = checkTimestamp(section.source_end, duration, `${label}.chronological_sections[${index}].end`);
        if (start > end) errors.push(`${label}: chronological section ${index} has a reversed source range.`);
      });
      if (!Array.isArray(entry.uncertain_passages) || entry.uncertain_passages.length < 1) errors.push(`${label}: uncertain transcript passages must be disclosed.`);
      if (!Array.isArray(entry.excluded_ranges) || entry.excluded_ranges.length < 1) errors.push(`${label}: intentionally excluded ranges must be recorded.`);
    }
    if (label === "B2/9") {
      const requiredMetrics = ["caption_coverage", "audio_coverage", "visual_timeline_coverage", "visual_content_coverage", "combined_semantic_coverage"];
      requiredMetrics.forEach((key) => {
        if (!Number.isFinite(entry[key]) || entry[key] < 0 || entry[key] > 100) errors.push(`${label}: invalid ${key}.`);
      });
      if (entry.visual_review_status !== "source_verified" || entry.audio_review_status !== "source_verified" || entry.overall_review_status !== "source_verified") errors.push(`${label}: audiovisual review statuses are incomplete.`);
      if (entry.visual_timeline_coverage !== 100) errors.push(`${label}: the full visual timeline was not inspected.`);
      if (entry.combined_semantic_coverage !== 100 || !entry.completeness?.all_verified_teaching_items_mapped) errors.push(`${label}: verified teaching items are not semantically mapped.`);
      if (entry.caption_quality_status !== "unreliable_for_german_spelling") errors.push(`${label}: caption quality finding was lost.`);
      const documentedVocabulary = new Set((entry.vocabulary_from_video ?? []).map((item) => item.de));
      for (const word of b29Fixture.vocabulary) {
        if (!documentedVocabulary.has(word.german)) errors.push(`${label}: verified vocabulary missing: ${word.german}.`);
        const section = (entry.chronological_sections ?? []).find((item) => item.heading.includes(word.german));
        if (!section) errors.push(`${label}: no documentation section maps ${word.german}.`);
        else if (!section.evidence?.frame || !Array.isArray(section.evidence?.transcript_segments)) errors.push(`${label}: ${word.german} section lacks audiovisual evidence.`);
      }
      const fixtureExamples = new Map(b29Fixture.examples.map((item) => [item.de, item]));
      for (const example of entry.examples_from_video ?? []) {
        const evidence = fixtureExamples.get(example.de);
        if (!evidence) errors.push(`${label}: video-derived example is absent from the reviewed fixture: ${example.de}`);
        if (!example.evidence_frame || !Array.isArray(example.transcript_segments)) errors.push(`${label}: video-derived example lacks evidence references: ${example.de}`);
        else if (!existsSync(path.join(root, ".cache", "documentation-sources", "B2-9-Qaz5jjNHBvc-visual", example.evidence_frame))) errors.push(`${label}: evidence frame is unavailable: ${example.evidence_frame}`);
      }
      for (const example of b29Fixture.examples) if (!(entry.examples_from_video ?? []).some((item) => item.de === example.de)) errors.push(`${label}: verified video example missing: ${example.de}`);
      const finalText = JSON.stringify(entry);
      const forbiddenFiller = ["تعلّم مجموعة من مفردات B2", "راقب المعنى والسياق", "اكتب جملة لكل كلمة", "راجع التصريف والترتيب"];
      forbiddenFiller.forEach((phrase) => { if (finalText.includes(phrase)) errors.push(`${label}: generic filler remains: ${phrase}`); });
      if ((entry.unresolved_items ?? []).length) errors.push(`${label}: unresolved source content is presented in a completed lesson.`);
    }
    if (!Array.isArray(entry.task_preparation) || entry.task_preparation.length !== lesson.tasks.length) errors.push(`${label}: task indexes changed or missing.`);
    else entry.task_preparation.forEach((item, index) => { if (item.task_index !== index || !hasText(item.guidance) || typeof item.video_required !== "boolean") errors.push(`${label}: invalid task preparation ${index}.`); });
    inspectText(entry, label);
    fingerprints.push({ label, text: `${entry.summary} ${entry.explanation.map((item) => item.content).join(" ")}` });
    const candidates = [path.join(root, ".cache", "documentation-sources", `${entry.video_id}.json`), path.join(root, ".cache", "documentation-sources", `${level}-${lesson.id}-${entry.video_id}-${entry.source_model}.transcription.json`)];
    const sourcePath = candidates.find(existsSync);
    if (sourcePath) {
      const source = JSON.parse(await readFile(sourcePath, "utf8"));
      entry.examples_from_video.forEach((item, index) => {
        const at = timestampSeconds(item.timestamp);
        const nearby = source.segments?.filter((segment) => segment.start_seconds <= at + 20 && segment.end_seconds >= at - 20) ?? [];
        if (!nearby.length) errors.push(`${label}: no source segment near example ${index}.`);
        if (label === "A1/3" && item.verified) {
          const normalize = (text) => String(text).toLocaleLowerCase("de").replace(/[^a-zäöüß\s]/gu, " ").replace(/\s+/g, " ").trim();
          if (!normalize(nearby.map((segment) => segment.text).join(" ")).includes(normalize(item.de))) errors.push(`${label}: verified German example ${index} is not present near its transcript timestamp.`);
        }
      });
    } else warnings.push(`${label}: normalized source cache unavailable; proximity check skipped.`);
  }
}

for (let index = 0; index < fingerprints.length; index += 1) for (let other = index + 1; other < fingerprints.length; other += 1) {
  const score = similarity(fingerprints[index].text, fingerprints[other].text);
  if (score >= 0.9) errors.push(`${fingerprints[index].label} and ${fingerprints[other].label}: suspiciously similar (${score.toFixed(2)}).`);
}
if (errors.length) { console.error(`FAIL documentation validation (${errors.length} errors)`); errors.forEach((error) => console.error(`- ${error}`)); process.exitCode = 1; }
else console.log("PASS documentation validation");
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
console.log(JSON.stringify(report, null, 2));
