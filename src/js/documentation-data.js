const DOCUMENTATION_LOADERS = Object.freeze({
  A1: () => import("../data/documentation/a1Documentation.json", { with: { type: "json" } }),
  A2: () => import("../data/documentation/a2Documentation.json", { with: { type: "json" } }),
  B1: () => import("../data/documentation/b1Documentation.json", { with: { type: "json" } }),
  B2: () => import("../data/documentation/b2Documentation.json", { with: { type: "json" } }),
});

const levelCache = new Map();

export function loadLevelDocumentation(level) {
  if (!DOCUMENTATION_LOADERS[level]) return Promise.reject(new Error(`Unknown documentation level: ${level}`));
  if (!levelCache.has(level)) {
    levelCache.set(level, DOCUMENTATION_LOADERS[level]().then(({ default: source }) => normalizeLevel(source)));
  }
  return levelCache.get(level);
}

export function buildDocumentationSearchText(entry) {
  return [
    entry.summary,
    ...entry.learning_objectives,
    ...entry.video_outline.flatMap((section) => [section.heading, section.summary]),
    ...entry.chronological_sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.concepts ?? []),
      ...(section.warnings ?? []),
      ...(section.examples ?? []).flatMap((example) => [example.de, example.ar, example.note]),
    ]),
    ...entry.explanation.flatMap((section) => [section.heading, section.content]),
    ...entry.rules_from_video.flatMap((rule) => [rule.rule, rule.explanation, rule.pattern]),
    ...entry.grammar_rules.flatMap((rule) => [rule.rule, rule.explanation, rule.pattern]),
    ...entry.examples_from_video.flatMap((example) => [example.de, example.ar, example.note]),
    ...entry.examples.flatMap((example) => [example.de, example.ar, example.note]),
    ...entry.vocabulary_from_video.flatMap((word) => [word.de, word.ar, word.note]),
    ...entry.vocabulary.flatMap((word) => [word.de, word.ar, word.note]),
    ...entry.teacher_notes.flatMap((item) => typeof item === "string" ? [item] : [item.text]),
    ...entry.quick_recap,
  ].join(" ");
}

function normalizeLevel(source) {
  const entries = Array.isArray(source) ? source : [];
  const byLessonId = new Map();
  const searchableByLessonId = new Map();
  for (const entry of entries) {
    const normalized = normalizeEntry(entry);
    const key = String(normalized.lesson_id);
    byLessonId.set(key, normalized);
    searchableByLessonId.set(key, normalizeForSearch(buildDocumentationSearchText(normalized)));
  }
  return Object.freeze({
    entries: Object.freeze([...byLessonId.values()]),
    byLessonId,
    searchableByLessonId,
  });
}

function normalizeEntry(entry) {
  const array = (value) => Array.isArray(value) ? value : [];
  return Object.freeze({
    ...entry,
    learning_objectives: Object.freeze(array(entry.learning_objectives)),
    video_outline: Object.freeze(array(entry.video_outline)),
    chronological_sections: Object.freeze(array(entry.chronological_sections)),
    explanation: Object.freeze(array(entry.explanation)),
    rules_from_video: Object.freeze(array(entry.rules_from_video)),
    grammar_rules: Object.freeze(array(entry.grammar_rules)),
    examples_from_video: Object.freeze(array(entry.examples_from_video)),
    examples: Object.freeze(array(entry.examples)),
    vocabulary_from_video: Object.freeze(array(entry.vocabulary_from_video)),
    vocabulary: Object.freeze(array(entry.vocabulary)),
    teacher_notes: Object.freeze(array(entry.teacher_notes)),
    exercises_demonstrated: Object.freeze(array(entry.exercises_demonstrated)),
    common_mistakes: Object.freeze(array(entry.common_mistakes)),
    quick_recap: Object.freeze(array(entry.quick_recap)),
    task_preparation: Object.freeze(array(entry.task_preparation)),
    tables: Object.freeze(array(entry.tables)),
  });
}

function normalizeForSearch(value) {
  return String(value ?? "").normalize("NFC").toLocaleLowerCase();
}
