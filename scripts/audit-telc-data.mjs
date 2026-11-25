import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const levels = ["b1", "b2"];
const issues = [];
const warnings = [];
const hearingCoverage = { exercises: 0, scored: 0, transcripts: 0, audio: 0 };
const runtimeEvidenceOverrides = new Set([
  "lv1_spiele:0", "lv1_spiele:2", "lv1_spiele:3",
  "lv1_familie:1", "lv1_familie:3", "lv1_umwelt:0",
  "lv1_bonbon:0", "lv1_bonbon:1", "lv1_bonbon:2", "lv1_bonbon:3", "lv1_bonbon:4",
  "lv1_wahlen:0", "lv1_wahlen:2", "lv1_wahlen:3", "lv1_rauchen:3",
  "lv1_tanzkurs:0", "lv1_tanzkurs:3", "lv1_tanzkurs:4",
  "lv1_pferde:0", "lv1_pferde:1", "lv1_pferde:2", "lv1_pferde:3",
  "lv1_benzin:2", "lv1_benzin:4", "lv1_nase:0", "lv1_jugend:4",
  "lv1_handwerk:1", "lv1_handwerk:2", "lv1_handwerk:3", "lv1_handwerk:4",
  "lv1_foto:0", "lv1_wetter_sturm:0", "lv1_loewen:1",
  "lv1_babytv:0", "lv1_babytv:3",
]);

function report(bucket, level, module, key, message) {
  bucket.push(`${level.toUpperCase()} · ${module} · ${key}: ${message}`);
}

function stringsIn(value, path = "$") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((entry, index) => stringsIn(entry, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, entry]) => stringsIn(entry, `${path}.${key}`));
  return [];
}

function auditCommon(level, module, item, index, seen) {
  const key = String(item.key || item.id || `${module}-${index}`);
  if (seen.has(key)) report(issues, level, module, key, "duplicate exercise key/id");
  seen.add(key);
  for (const [path, text] of stringsIn(item)) {
    if (text !== text.normalize("NFC")) report(issues, level, module, key, `${path} is not NFC-normalized`);
    if (/\uFFFD/u.test(text)) report(issues, level, module, key, `${path} contains a replacement character`);
    if (/\b(?:ae|oe|ue)(?:nder|ber|bung|sterreich|rger|hl|ße|ssen)/i.test(text)) {
      report(warnings, level, module, key, `${path} may contain an avoidable umlaut transliteration`);
    }
  }
  return key;
}

function auditHeadingMatch(level, module, item, key) {
  if (item.texte.length !== 5) report(issues, level, module, key, `expected 5 texts, found ${item.texte.length}`);
  if (item.headings.length !== 10) report(issues, level, module, key, `expected 10 headings, found ${item.headings.length}`);
  if (item.texte.length !== item.answers.length) report(issues, level, module, key, "text and answer counts differ");
  const allowed = new Set(item.headings.map((_, index) => String.fromCharCode(97 + index)));
  item.answers.forEach((answer, index) => {
    if (!allowed.has(String(answer).toLowerCase())) report(issues, level, module, key, `answer ${index + 1} does not reference a heading`);
  });
  if (new Set(item.answers.map((answer) => String(answer).toLowerCase())).size !== item.answers.length) {
    report(issues, level, module, key, "correct headings must not be reused within one exercise");
  }
  const evidenceCount = item.texte.filter((text, index) => {
    if (/\*\*.+?\*\*/s.test(text)) return true;
    if ((item.textKeywords?.[index] || []).some((phrase) => String(text).toLocaleLowerCase("de-DE").includes(String(phrase).toLocaleLowerCase("de-DE")))) return true;
    if (runtimeEvidenceOverrides.has(`${key}:${index}`)) return true;
    const answerIndex = String(item.answers[index]).toLowerCase().charCodeAt(0) - 97;
    return hasHeadingEvidence(text, item.headings[answerIndex] || "");
  }).length;
  if (evidenceCount < item.texte.length) report(warnings, level, module, key, `${item.texte.length - evidenceCount} passage(s) have no keyword evidence`);
}

const evidenceStopWords = new Set("aber alle allem allen aller alles auch beim bereits damit dann dass deine einem einen einer eines für haben ihre ihren ihrer ihres immer kann können macht mehr neue neuen neuer neues nicht noch oder ohne sehr sein seine seit sich sind sowie über unter vom von vor wenn werden wird wurde zum zur zwischen".split(" "));

function hasHeadingEvidence(text, heading) {
  const words = String(heading).replace(/\*\*/g, "").toLocaleLowerCase("de-DE").match(/[a-zäöüß]{5,}/gu) || [];
  const sourceWords = String(text).toLocaleLowerCase("de-DE").match(/[a-zäöüß]{5,}/gu) || [];
  return words.some((word) => !evidenceStopWords.has(word) && sourceWords.some((sourceWord) =>
    sourceWord === word || (word.length >= 7 && sourceWord.length >= 7 && sourceWord.slice(0, 6) === word.slice(0, 6))
  ));
}

function auditGaps(level, module, item, key) {
  const placeholders = [...String(item.briefText || "").matchAll(/\[(\d+)b?\]/g)].map((match) => match[1]);
  const gapItems = Array.isArray(item.items)
    ? item.items
    : Object.entries(item.answers || {}).map(([id, answer]) => ({ id, answer }));
  const ids = gapItems.map((entry) => String(entry.id));
  ids.forEach((id) => {
    if (!placeholders.includes(id)) report(issues, level, module, key, `gap ${id} has no placeholder in briefText`);
  });
  [...new Set(placeholders)].forEach((id) => {
    if (!ids.includes(id)) report(issues, level, module, key, `placeholder ${id} has no gap definition`);
  });
  gapItems.forEach((entry) => {
    if (entry.opts && !/^[a-z]$/i.test(String(entry.answer))) report(issues, level, module, key, `gap ${entry.id} has an invalid option answer`);
    if (entry.opts) {
      const index = String(entry.answer).toLowerCase().charCodeAt(0) - 97;
      if (!entry.opts[index]) report(issues, level, module, key, `gap ${entry.id} answer points outside its options`);
    }
  });
}

function auditReadingChoice(level, module, item, key) {
  const questions = item.questions || item.variants?.[0]?.fragen || [];
  if (!questions.length) report(issues, level, module, key, "has no questions");
  if (questions.length !== 5) report(issues, level, module, key, `expected 5 questions, found ${questions.length}`);
  questions.forEach((question, index) => {
    const options = question.opts || question.options || [];
    const answer = question.answer ?? question.correct;
    const answerIndex = typeof answer === "number" ? answer : String(answer).toLowerCase().charCodeAt(0) - 97;
    if (!options[answerIndex]) report(issues, level, module, key, `question ${index + 1} answer points outside its options`);
  });
}

function auditSituationMatch(level, module, item, key) {
  const materials = item.anzeigen || item.infotexts || {};
  const materialKeys = new Set(Object.keys(materials).map((letter) => letter.toLowerCase()));
  if (item.situations.length < 10 || item.situations.length > 12) report(issues, level, module, key, `expected 10–12 situations, found ${item.situations.length}`);
  if (materialKeys.size < 11 || materialKeys.size > 12) report(issues, level, module, key, `expected 11 or 12 advertisements, found ${materialKeys.size}`);
  item.situations.forEach((situation, index) => {
    const answer = String(situation.answer).toLowerCase();
    if (answer !== "x" && !materialKeys.has(answer)) report(issues, level, module, key, `situation ${index + 1} references missing advertisement ${situation.answer}`);
  });
}

function auditListening(item) {
  hearingCoverage.exercises += 1;
  if (item.items?.length && item.items.every((entry) => typeof entry.answer === "boolean")) hearingCoverage.scored += 1;
  if (typeof item.hoertext === "string" && item.hoertext.trim()) hearingCoverage.transcripts += 1;
  if (item.audio || item.audioUrl || item.src) hearingCoverage.audio += 1;
}

for (const level of levels) {
  const data = JSON.parse(await readFile(new URL(`src/data/telc/${level}.json`, root), "utf8"));
  for (const [module, items] of Object.entries(data.modules)) {
    const seen = new Set();
    items.forEach((item, index) => {
      const key = auditCommon(level, module, item, index, seen);
      if (module === "lesenTeil1") auditHeadingMatch(level, module, item, key);
      if (module === "lesenTeil2") auditReadingChoice(level, module, item, key);
      if (module === "lesenTeil3") auditSituationMatch(level, module, item, key);
      if (module.startsWith("sprachbausteine")) auditGaps(level, module, item, key);
      if (module.startsWith("hoeren")) auditListening(item);
    });
  }
}

console.log(`TELC data audit: ${issues.length} error(s), ${warnings.length} warning(s)`);
console.log(`Hören coverage: ${hearingCoverage.exercises} exercises, ${hearingCoverage.scored} scored, ${hearingCoverage.transcripts} transcripts, ${hearingCoverage.audio} bundled audio files`);
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
issues.forEach((issue) => console.error(`ERROR ${issue}`));
if (issues.length) process.exitCode = 1;
