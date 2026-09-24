import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = {
  a1: { lessons: 57, tasks: 228 },
  a2: { lessons: 42, tasks: 168 },
  b1: { lessons: 24, tasks: 96 },
  b2: { lessons: 18, tasks: 90 },
};
const requiredFields = ["id", "title", "focus", "what_you_learn", "conversational_goal", "url", "tasks"];
const textFields = ["title", "focus", "what_you_learn", "conversational_goal", "url"];
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
const invisibleControlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const htmlPattern = /<\/?[a-z][^>]*>/iu;
const mixedLanguageJoinPattern = /(?:[\p{Script=Arabic}][A-Za-zÄÖÜäöüß]|[A-Za-zÄÖÜäöüß][\p{Script=Arabic}])/u;
const brokenArabicJoinPattern = /أو(?:فعل|حالة|توقف|حالات|عملت|خطة|الجمل|كلاهما|خدمة|تعليمات|طريقة|كلمة|التركيب|تجربة|الأفعال|الصفات|فوائد|عمل|غاية|فاعل|تنكير|بدون|معنى|السؤال|يمتلك|ترتيب|تحويل|ضداً|شرحاً|الضمير|أسئلة|الدراسة|المحايد|المؤنث|الجمع|مؤسستين|شخص|إلى|نصاً|حرف)/u;
let totalLessons = 0;
let totalTasks = 0;
let failed = false;

function fail(level, message) {
  failed = true;
  console.error(`FAIL ${level.toUpperCase()}: ${message}`);
}

function validateText(level, lessonId, label, value) {
  if (typeof value !== "string" || !value.trim()) {
    fail(level, `lesson ${lessonId} ${label} must be a non-empty string`);
    return;
  }
  if (value !== value.trim()) fail(level, `lesson ${lessonId} ${label} has leading or trailing whitespace`);
  if (value !== value.normalize("NFC")) fail(level, `lesson ${lessonId} ${label} is not NFC-normalized`);
  if (value.includes("\uFFFD")) fail(level, `lesson ${lessonId} ${label} contains a replacement character`);
  if (invisibleControlPattern.test(value)) fail(level, `lesson ${lessonId} ${label} contains an invisible control character`);
  if (htmlPattern.test(value)) fail(level, `lesson ${lessonId} ${label} contains accidental HTML`);
  if (mixedLanguageJoinPattern.test(value)) fail(level, `lesson ${lessonId} ${label} joins Arabic and German/Latin text without a space`);
  if (brokenArabicJoinPattern.test(value)) fail(level, `lesson ${lessonId} ${label} contains broken Arabic spacing`);
}

function validateYoutubeUrl(level, lessonId, value) {
  try {
    const parsed = new URL(value);
    const videoId = parsed.hostname.endsWith("youtu.be")
      ? parsed.pathname.slice(1).split("/")[0]
      : parsed.searchParams.get("v") || parsed.pathname.match(/^\/embed\/([^/?]+)/)?.[1] || "";
    if (!youtubeHosts.has(parsed.hostname.toLowerCase()) || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      fail(level, `lesson ${lessonId} has a malformed or unsupported YouTube URL`);
    }
  } catch {
    fail(level, `lesson ${lessonId} has an invalid video URL`);
  }
}

for (const [level, expectedCounts] of Object.entries(expected)) {
  const filename = path.join(root, "src", "data", `${level}Lessons.json`);
  try {
    const data = JSON.parse(await readFile(filename, "utf8"));
    if (!Array.isArray(data.lessons)) throw new Error("lessons is not an array");

    const ids = new Set();
    const lessonFingerprints = new Set();
    let levelTasks = 0;

    data.lessons.forEach((lesson, index) => {
      const lessonId = lesson?.id ?? `at-index-${index}`;
      if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
        fail(level, `lesson ${index + 1} is not an object`);
        return;
      }

      const missing = requiredFields.filter((field) => !(field in lesson));
      if (missing.length) fail(level, `lesson ${lessonId} is missing: ${missing.join(", ")}`);
      if (!Number.isInteger(lesson.id)) fail(level, `lesson ${lessonId} id must be an integer`);
      if (lesson.id !== index + 1) fail(level, `lesson ${lessonId} is out of sequence; expected ${index + 1}`);
      if (ids.has(String(lesson.id))) fail(level, `duplicate lesson id: ${lesson.id}`);
      ids.add(String(lesson.id));

      const fingerprint = JSON.stringify(lesson);
      if (lessonFingerprints.has(fingerprint)) fail(level, `lesson ${lessonId} duplicates another lesson object`);
      lessonFingerprints.add(fingerprint);

      textFields.forEach((field) => validateText(level, lessonId, field, lesson[field]));
      if (typeof lesson.url === "string" && lesson.url.trim()) validateYoutubeUrl(level, lessonId, lesson.url);

      if (!Array.isArray(lesson.tasks) || lesson.tasks.length === 0) {
        fail(level, `lesson ${lessonId} tasks must be a non-empty array`);
        return;
      }

      const seenTasks = new Set();
      levelTasks += lesson.tasks.length;
      lesson.tasks.forEach((task, taskIndex) => {
        validateText(level, lessonId, `tasks[${taskIndex}]`, task);
        if (typeof task === "string") {
          if (seenTasks.has(task)) fail(level, `lesson ${lessonId} repeats task text at index ${taskIndex}`);
          seenTasks.add(task);
        }
      });
    });

    totalLessons += data.lessons.length;
    totalTasks += levelTasks;
    if (data.lessons.length !== expectedCounts.lessons) fail(level, `expected ${expectedCounts.lessons} lessons, found ${data.lessons.length}`);
    if (levelTasks !== expectedCounts.tasks) fail(level, `expected ${expectedCounts.tasks} tasks, found ${levelTasks}`);
    console.log(`${failed ? "CHECKED" : "PASS"} ${level.toUpperCase()}: ${data.lessons.length} lessons, ${levelTasks} tasks`);
  } catch (error) {
    fail(level, error.message);
  }
}

console.log(`Validated ${totalLessons} lessons and ${totalTasks} tasks.`);
if (totalLessons !== 141 || totalTasks !== 582) {
  failed = true;
  console.error(`FAIL TOTAL: expected 141 lessons and 582 tasks, found ${totalLessons} and ${totalTasks}`);
}
if (failed) process.exitCode = 1;
