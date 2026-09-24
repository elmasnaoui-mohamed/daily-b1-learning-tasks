import a1Source from "../data/a1Lessons.json" with { type: "json" };
import a2Source from "../data/a2Lessons.json" with { type: "json" };
import b1Source from "../data/b1Lessons.json" with { type: "json" };
import b2Source from "../data/b2Lessons.json" with { type: "json" };

const LEVEL_SOURCES = {
  A1: a1Source,
  A2: a2Source,
  B1: b1Source,
  B2: b2Source,
};

export const LEVEL_KEYS = Object.freeze(Object.keys(LEVEL_SOURCES));

function asText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTask(level, lessonId, task, taskIndex, duplicateLegacyIds) {
  const text = typeof task === "string" ? task : asText(task?.text, "مهمة غير متاحة");
  const sourceId = typeof task === "object" && task !== null && task.id != null ? String(task.id) : String(taskIndex);
  const legacyBaseId = `${level}:${lessonId}:${hashTaskText(text)}`;
  const legacyOccurrence = duplicateLegacyIds.get(legacyBaseId) ?? 0;
  duplicateLegacyIds.set(legacyBaseId, legacyOccurrence + 1);

  return Object.freeze({
    id: `${level}:${lessonId}:${sourceId}`,
    index: taskIndex,
    text,
    legacyId: legacyOccurrence === 0 ? legacyBaseId : `${legacyBaseId}:${legacyOccurrence + 1}`,
  });
}

function normalizeLesson(level, lesson, lessonIndex) {
  const id = lesson?.id ?? `invalid-${lessonIndex + 1}`;
  const tasks = Array.isArray(lesson?.tasks) ? lesson.tasks : [];
  const duplicateLegacyIds = new Map();

  return Object.freeze({
    id,
    title: asText(lesson?.title, `الدرس ${lessonIndex + 1}`),
    focus: asText(lesson?.focus, "محور غير محدد"),
    what_you_learn: asText(lesson?.what_you_learn, "سيتم إضافة أهداف التعلم قريبًا."),
    conversational_goal: asText(lesson?.conversational_goal, "سيتم إضافة الهدف الحواري قريبًا."),
    url: asText(lesson?.url, ""),
    part: lesson?.part ?? null,
    tasks: Object.freeze(tasks.map((task, taskIndex) => normalizeTask(level, id, task, taskIndex, duplicateLegacyIds))),
  });
}

function normalizeLevel(level, source) {
  const lessons = Array.isArray(source?.lessons) ? source.lessons : [];

  return Object.freeze({
    key: level,
    label: level,
    title: asText(source?.playlist_title, `مستوى ${level} في اللغة الألمانية`),
    playlistUrl: asText(source?.playlist_url, "#"),
    playlistUrls: Array.isArray(source?.playlist_urls) ? Object.freeze([...source.playlist_urls]) : Object.freeze([]),
    lessons: Object.freeze(lessons.map((lesson, lessonIndex) => normalizeLesson(level, lesson, lessonIndex))),
  });
}

export const COURSE_LEVELS = Object.freeze(
  Object.fromEntries(Object.entries(LEVEL_SOURCES).map(([level, source]) => [level, normalizeLevel(level, source)]))
);

export const VALIDATION_REPORT = Object.freeze(validateSources(LEVEL_SOURCES));

export function validateSources(sources) {
  const errors = [];
  const warnings = [];
  const requiredTextFields = ["title", "focus", "what_you_learn", "conversational_goal", "url"];
  let lessonCount = 0;
  let taskCount = 0;

  for (const level of LEVEL_KEYS) {
    const source = sources[level];
    if (!source || typeof source !== "object") {
      errors.push(`${level}: ملف المستوى غير صالح.`);
      continue;
    }
    if (!Array.isArray(source.lessons)) {
      errors.push(`${level}: الحقل lessons يجب أن يكون مصفوفة.`);
      continue;
    }

    const seenIds = new Set();
    source.lessons.forEach((lesson, lessonIndex) => {
      lessonCount += 1;
      const label = `${level} / lesson ${lessonIndex + 1}`;
      if (lesson?.id == null || lesson.id === "") {
        errors.push(`${label}: معرّف الدرس مفقود.`);
      } else if (seenIds.has(String(lesson.id))) {
        errors.push(`${label}: معرّف الدرس مكرر (${lesson.id}).`);
      } else {
        seenIds.add(String(lesson.id));
      }

      requiredTextFields.forEach((field) => {
        if (typeof lesson?.[field] !== "string" || !lesson[field].trim()) {
          warnings.push(`${label}: الحقل ${field} مفقود أو فارغ.`);
        }
      });

      if (!Array.isArray(lesson?.tasks)) {
        errors.push(`${label}: الحقل tasks يجب أن يكون مصفوفة.`);
      } else {
        taskCount += lesson.tasks.length;
        if (lesson.tasks.length === 0) warnings.push(`${label}: لا توجد مهام.`);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings, lessonCount, taskCount };
}

export function getLevel(level) {
  return COURSE_LEVELS[level] ?? null;
}

export function getLesson(level, lessonId) {
  return getLevel(level)?.lessons.find((lesson) => String(lesson.id) === String(lessonId)) ?? null;
}

export function getLessonPosition(level, lessonId) {
  return getLevel(level)?.lessons.findIndex((lesson) => String(lesson.id) === String(lessonId)) ?? -1;
}

export function getYoutubeEmbedUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    let videoId = "";
    if (parsed.hostname.includes("youtu.be")) videoId = parsed.pathname.slice(1).split("/")[0];
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") || parsed.pathname.match(/^\/embed\/([^/?]+)/)?.[1] || "";
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&enablejsapi=1` : "";
  } catch {
    return "";
  }
}

function hashTaskText(text) {
  let hash = 2166136261;
  for (const character of String(text).normalize("NFC")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
