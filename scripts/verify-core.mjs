import assert from "node:assert/strict";
import {
  COURSE_LEVELS,
  LEVEL_KEYS,
  getLesson,
  getLessonPosition,
  getYoutubeEmbedUrl,
} from "../src/js/course-data.js";
import { createProgressStore } from "../src/js/progress-store.js";
import { buildDocumentationSearchText, loadLevelDocumentation } from "../src/js/documentation-data.js";

class MemoryStorage {
  #values = new Map();

  constructor(entries = {}) {
    Object.entries(entries).forEach(([key, value]) => this.#values.set(key, String(value)));
  }

  get length() { return this.#values.size; }
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
  key(index) { return [...this.#values.keys()][index] ?? null; }
}

assert.deepEqual(LEVEL_KEYS, ["A1", "A2", "B1", "B2"]);
assert.equal(Object.values(COURSE_LEVELS).reduce((sum, level) => sum + level.lessons.length, 0), 141);
assert.equal(Object.values(COURSE_LEVELS).flatMap((level) => level.lessons).reduce((sum, lesson) => sum + lesson.tasks.length, 0), 582);

for (const levelKey of LEVEL_KEYS) {
  const level = COURSE_LEVELS[levelKey];
  assert.equal(getLessonPosition(levelKey, level.lessons[0].id), 0);
  assert.equal(getLessonPosition(levelKey, level.lessons.at(-1).id), level.lessons.length - 1);
  assert.equal(getLesson(levelKey, "missing"), null);
  assert.equal(getLessonPosition(levelKey, "missing"), -1);
}

const firstLesson = COURSE_LEVELS.A1.lessons[0];
assert.match(getYoutubeEmbedUrl(firstLesson.url), /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?rel=0&enablejsapi=1$/);
assert.equal(getYoutubeEmbedUrl("not a url"), "");

const emptyStorage = new MemoryStorage();
const store = createProgressStore(COURSE_LEVELS, emptyStorage);
assert.deepEqual(store.getOverallStats(), {
  totalLessons: 141,
  completedLessons: 0,
  remainingLessons: 141,
  totalTasks: 582,
  completedTasks: 0,
  percent: 0,
});

store.setTaskComplete(firstLesson.tasks[0].id, true);
assert.equal(store.isTaskComplete(firstLesson.tasks[0].id), true);
assert.equal(store.getLessonStats(firstLesson).completedTasks, 1);
store.setLessonComplete(firstLesson, true);
assert.equal(store.getLessonStats(firstLesson).completed, true);
store.setLessonComplete(firstLesson, false);
assert.equal(store.getLessonStats(firstLesson).completedTasks, 0);
store.setLastVisited("B1", 3);
assert.deepEqual(store.getLastVisited(), { level: "B1", lessonId: 3 });

const brokenStorage = new MemoryStorage({ "germanLearning:progress:v3": "{broken" });
const recovered = createProgressStore(COURSE_LEVELS, brokenStorage);
assert.equal(recovered.getOverallStats().completedTasks, 0);

const legacyTask = COURSE_LEVELS.A1.lessons[0].tasks[0];
const legacyStorage = new MemoryStorage({
  "germanLearning:taskCompletion:v2": JSON.stringify({ [legacyTask.legacyId]: true }),
});
const migrated = createProgressStore(COURSE_LEVELS, legacyStorage);
assert.equal(migrated.isTaskComplete(legacyTask.id), true);
assert.ok(migrated.snapshot.migratedFrom.includes("taskCompletion:v2"));

const b1Search = COURSE_LEVELS.B1.lessons.filter((lesson) => [
  lesson.title,
  lesson.focus,
  lesson.what_you_learn,
  lesson.conversational_goal,
  ...lesson.tasks.map((task) => task.text),
].join(" ").normalize("NFC").toLocaleLowerCase().includes("infinitiv"));
assert.equal(b1Search.length, 4);
assert.equal(COURSE_LEVELS.B1.lessons.filter((lesson) => lesson.focus === "Satzstruktur").length, 3);

const a1Documentation = await loadLevelDocumentation("A1");
const b2Documentation = await loadLevelDocumentation("B2");
assert.equal(a1Documentation.entries.length, COURSE_LEVELS.A1.lessons.length);
assert.equal(b2Documentation.entries.length, COURSE_LEVELS.B2.lessons.length);
assert.match(buildDocumentationSearchText(a1Documentation.byLessonId.get("1")), /das Auto/i);
assert.ok(a1Documentation.searchableByLessonId.get("5").includes("الملكية"));
assert.match(buildDocumentationSearchText(b2Documentation.byLessonId.get("1")), /lachend/i);
assert.equal(a1Documentation.byLessonId.get("1").video_id, "ksDYRyXG0A8");

console.log("PASS core verification: data access, boundaries, progress, migration, recovery, search, and filtering");
