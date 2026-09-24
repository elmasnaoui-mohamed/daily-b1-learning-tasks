const STORAGE_KEY = "germanLearning:progress:v3";
const LEGACY_TASK_KEY = "germanLearning:taskCompletion:v2";
const LEGACY_LEVEL_KEY = "germanLearning:lastLevel";
const LEGACY_LESSON_KEY = "germanLearning:lastLesson";

function emptyProgress() {
  return { version: 3, completedTasks: {}, lastVisited: null, migratedFrom: [] };
}

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeProgress(value) {
  const progress = emptyProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return progress;

  progress.completedTasks = Object.fromEntries(
    Object.entries(value.completedTasks ?? {}).filter(([, completed]) => completed === true)
  );
  progress.lastVisited = value.lastVisited && typeof value.lastVisited === "object" ? value.lastVisited : null;
  progress.migratedFrom = Array.isArray(value.migratedFrom) ? [...value.migratedFrom] : [];
  return progress;
}

function migrateLegacyProgress(storage, levels) {
  const progress = emptyProgress();
  const legacyCompletion = readJson(storage, LEGACY_TASK_KEY);
  const aliasMap = new Map();

  Object.values(levels).forEach((level) => {
    level.lessons.forEach((lesson) => {
      lesson.tasks.forEach((task) => aliasMap.set(task.legacyId, task.id));
    });
  });

  if (legacyCompletion && typeof legacyCompletion === "object" && !Array.isArray(legacyCompletion)) {
    Object.entries(legacyCompletion).forEach(([legacyId, completed]) => {
      const stableId = aliasMap.get(legacyId);
      if (stableId && (completed === true || completed === "true")) progress.completedTasks[stableId] = true;
    });
    progress.migratedFrom.push("taskCompletion:v2");
  }

  try {
    const patterns = [
      { regex: /^b1-lesson-(\d+)-task-(\d+)$/i, fixedLevel: "B1", lessonGroup: 1, taskGroup: 2 },
      { regex: /^b1-([AB]\d+)-(\d+)-task-(\d+)$/i, levelGroup: 1, lessonGroup: 2, taskGroup: 3 },
      { regex: /^([AB]\d+)-(\d+)-task-(\d+)$/i, levelGroup: 1, lessonGroup: 2, taskGroup: 3 },
    ];
    for (let index = 0; index < (storage?.length ?? 0); index += 1) {
      const key = storage.key(index);
      if (!key || storage.getItem(key) !== "true") continue;
      for (const pattern of patterns) {
        const match = key.match(pattern.regex);
        if (!match) continue;
        const levelKey = pattern.fixedLevel ?? match[pattern.levelGroup].toUpperCase();
        const lessonId = match[pattern.lessonGroup];
        const taskIndex = Number(match[pattern.taskGroup]);
        const lesson = levels[levelKey]?.lessons.find((item) => String(item.id) === String(lessonId));
        const task = lesson?.tasks[taskIndex];
        if (task) progress.completedTasks[task.id] = true;
        break;
      }
    }
  } catch {
    // Storage enumeration can be blocked; the rest of the app remains usable.
  }

  const legacyLesson = readJson(storage, LEGACY_LESSON_KEY);
  if (legacyLesson?.level && legacyLesson?.lessonId != null) {
    progress.lastVisited = { level: legacyLesson.level, lessonId: legacyLesson.lessonId };
  } else {
    try {
      const level = storage?.getItem(LEGACY_LEVEL_KEY);
      if (level && levels[level]) progress.lastVisited = { level, lessonId: levels[level].lessons[0]?.id ?? null };
    } catch {
      // Ignore inaccessible legacy metadata.
    }
  }
  if (progress.lastVisited || Object.keys(progress.completedTasks).length) progress.migratedFrom.push("legacy-keys");
  return progress;
}

export function createProgressStore(levels, storage = globalThis.localStorage) {
  const existing = readJson(storage, STORAGE_KEY);
  let progress = existing?.version === 3 ? normalizeProgress(existing) : migrateLegacyProgress(storage, levels);
  writeJson(storage, STORAGE_KEY, progress);

  const save = () => writeJson(storage, STORAGE_KEY, progress);
  const isTaskComplete = (taskId) => progress.completedTasks[taskId] === true;

  return {
    key: STORAGE_KEY,
    get snapshot() {
      return JSON.parse(JSON.stringify(progress));
    },
    isTaskComplete,
    setTaskComplete(taskId, completed) {
      if (completed) progress.completedTasks[taskId] = true;
      else delete progress.completedTasks[taskId];
      save();
    },
    setLessonComplete(lesson, completed = true) {
      lesson.tasks.forEach((task) => {
        if (completed) progress.completedTasks[task.id] = true;
        else delete progress.completedTasks[task.id];
      });
      save();
    },
    setLastVisited(level, lessonId) {
      progress.lastVisited = { level, lessonId };
      save();
    },
    getLastVisited() {
      return progress.lastVisited ? { ...progress.lastVisited } : null;
    },
    getLessonStats(lesson) {
      const totalTasks = lesson.tasks.length;
      const completedTasks = lesson.tasks.filter((task) => isTaskComplete(task.id)).length;
      const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
      return {
        totalTasks,
        completedTasks,
        percent,
        status: completedTasks === 0 ? "not-started" : completedTasks === totalTasks && totalTasks > 0 ? "completed" : "in-progress",
        completed: totalTasks > 0 && completedTasks === totalTasks,
      };
    },
    getLevelStats(level) {
      const lessonStats = level.lessons.map((lesson) => this.getLessonStats(lesson));
      const totalTasks = lessonStats.reduce((sum, stats) => sum + stats.totalTasks, 0);
      const completedTasks = lessonStats.reduce((sum, stats) => sum + stats.completedTasks, 0);
      const completedLessons = lessonStats.filter((stats) => stats.completed).length;
      return {
        totalLessons: level.lessons.length,
        completedLessons,
        remainingLessons: level.lessons.length - completedLessons,
        totalTasks,
        completedTasks,
        percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      };
    },
    getOverallStats() {
      const stats = Object.values(levels).map((level) => this.getLevelStats(level));
      const totalLessons = stats.reduce((sum, item) => sum + item.totalLessons, 0);
      const completedLessons = stats.reduce((sum, item) => sum + item.completedLessons, 0);
      const totalTasks = stats.reduce((sum, item) => sum + item.totalTasks, 0);
      const completedTasks = stats.reduce((sum, item) => sum + item.completedTasks, 0);
      return {
        totalLessons,
        completedLessons,
        remainingLessons: totalLessons - completedLessons,
        totalTasks,
        completedTasks,
        percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      };
    },
  };
}
