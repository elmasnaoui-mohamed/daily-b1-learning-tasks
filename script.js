import a1Lessons from "./src/data/a1Lessons.json" with { type: "json" };
import a2Lessons from "./src/data/a2Lessons.json" with { type: "json" };
import b1Lessons from "./src/data/b1Lessons.json" with { type: "json" };
import b2Lessons from "./src/data/b2Lessons.json" with { type: "json" };

const LAST_LEVEL_STORAGE_KEY = "germanLearning:lastLevel";
const LAST_LESSON_STORAGE_KEY = "germanLearning:lastLesson";
const TASK_COMPLETION_STORAGE_KEY = "germanLearning:taskCompletion:v2";
const LESSON_HIGHLIGHT_DURATION = 2200;

const LEVELS = buildLevels({
  A1: a1Lessons,
  A2: a2Lessons,
  B1: b1Lessons,
  B2: b2Lessons,
});

const LEVEL_KEYS = Object.keys(LEVELS);

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "completed", label: "المنجز" },
  { value: "pending", label: "غير المنجز" },
];

const GLOBAL_PAGE_TITLE = "Deutsch mit Rinkute";

const state = {
  activeLevel: getInitialActiveLevel(),
  filters: Object.fromEntries(LEVEL_KEYS.map((level) => [level, createLevelFilters()])),
  openDropdown: null,
  isBackToTopVisible: false,
  highlightedLessonKey: null,
  highlightTimeoutId: null,
};

const elements = {
  heroPrimaryButton: document.querySelector("#heroPrimaryButton"),
  continueLearningButton: document.querySelector("#continueLearningButton"),
  continueLearningNote: document.querySelector("#continueLearningNote"),
  levelIntroTitle: document.querySelector("#levelIntroTitle"),
  levelIntroDescription: document.querySelector("#levelIntroDescription"),
  tasksContainer: document.querySelector("#tasksContainer"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  statusDropdownTrigger: document.querySelector("#statusDropdownTrigger"),
  statusDropdownText: document.querySelector("#statusDropdownText"),
  statusDropdownMenu: document.querySelector("#statusDropdownMenu"),
  focusDropdownTrigger: document.querySelector("#focusDropdownTrigger"),
  focusDropdownText: document.querySelector("#focusDropdownText"),
  focusDropdownMenu: document.querySelector("#focusDropdownMenu"),
  progressTitle: document.querySelector("#progressTitle"),
  progressFill: document.querySelector("#progressFill"),
  heroProgressText: document.querySelector("#heroProgressText"),
  heroProgressPercent: document.querySelector("#heroProgressPercent"),
  completedSummary: document.querySelector("#completedSummary"),
  progressBar: document.querySelector(".progress-bar"),
  summaryTitle: document.querySelector("#summaryTitle"),
  resultsSummary: document.querySelector("#resultsSummary"),
  visibleBreakdown: document.querySelector("#visibleBreakdown"),
  totalLessons: document.querySelector("#totalLessons"),
  mainFocuses: document.querySelector("#mainFocuses"),
  completedLessons: document.querySelector("#completedLessons"),
  remainingLessons: document.querySelector("#remainingLessons"),
  lessonsTitle: document.querySelector("#lessonsTitle"),
  lessonsDescription: document.querySelector("#lessonsDescription"),
  levelTabs: document.querySelector("#levelTabs"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  backToTopButton: document.querySelector("#backToTopButton"),
};

bootstrap();

function bootstrap() {
  bindEvents();

  try {
    migrateStoredProgress();
    restoreTaskCompletion();
    persistLastLevel(state.activeLevel);
    renderLevelTabs();
    renderDropdowns();
    render();
  } catch (error) {
    renderErrorState(error);
  }
}

function bindEvents() {
  elements.searchInput?.addEventListener("input", (event) => {
    getCurrentFilters().pending.search = event.target.value;
    syncFilters();
  });

  elements.levelTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-level]");
    if (!(tab instanceof HTMLButtonElement)) {
      return;
    }

    setActiveLevel(tab.dataset.level || LEVEL_KEYS[0]);
  });

  elements.statusDropdownTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown("status");
  });

  elements.focusDropdownTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown("focus");
  });

  elements.statusDropdownMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
    const option = event.target.closest("[data-option-value]");
    if (!(option instanceof HTMLElement)) {
      return;
    }

    getCurrentFilters().pending.statusFilter = option.dataset.optionValue || "all";
    closeDropdown("status");
    renderDropdowns();
    syncFilters();
  });

  elements.focusDropdownMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
    const option = event.target.closest("[data-option-value]");
    if (!(option instanceof HTMLElement)) {
      return;
    }

    toggleFocusFilter(option.dataset.optionValue || "all");
    renderDropdowns();
    syncFilters();
  });

  elements.clearFiltersButton?.addEventListener("click", () => {
    clearFilters();
  });

  elements.continueLearningButton?.addEventListener("click", () => {
    continueLearning();
  });

  elements.tasksContainer?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
      return;
    }

    const lessonId = Number(input.dataset.lessonId);
    const taskId = input.dataset.taskId;

    if (!Number.isFinite(lessonId) || !taskId) {
      return;
    }

    const task = getTaskById(state.activeLevel, lessonId, taskId);
    if (!task) {
      return;
    }

    persistLastLesson(state.activeLevel, lessonId);
    task.completed = input.checked;
    persistTaskCompletion();
    render();
  });

  elements.tasksContainer?.addEventListener("click", (event) => {
    const lessonCard = event.target.closest("[data-lesson-id]");
    if (!(lessonCard instanceof HTMLElement)) {
      return;
    }

    const lessonId = Number(lessonCard.dataset.lessonId);
    if (!Number.isFinite(lessonId)) {
      return;
    }

    persistLastLesson(state.activeLevel, lessonId);
  });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest(".custom-dropdown")) {
      closeAllDropdowns();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllDropdowns();
    }
  });

  elements.backToTopButton?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  window.addEventListener("scroll", handleBackToTopVisibility, { passive: true });
  handleBackToTopVisibility();
}

function createLevelFilters() {
  return {
    pending: createFilterSnapshot(),
    applied: createFilterSnapshot(),
  };
}

function createFilterSnapshot() {
  return {
    search: "",
    statusFilter: "all",
    focusFilters: new Set(),
  };
}

function getInitialActiveLevel() {
  const savedLevel = safelyReadLocalStorage(LAST_LEVEL_STORAGE_KEY);
  return savedLevel && LEVELS[savedLevel] ? savedLevel : LEVEL_KEYS[0] || "B1";
}

function getCurrentFilters() {
  return state.filters[state.activeLevel];
}

function getActiveLevelData() {
  return LEVELS[state.activeLevel];
}

function getActiveLessons() {
  return getActiveLevelData().lessons;
}

function buildLevels(levelSources) {
  return Object.fromEntries(
    Object.entries(levelSources).map(([level, data]) => [
      level,
      {
        label: level,
        title: data?.playlist_title ?? "",
        playlistUrl: data?.playlist_url ?? "#",
        lessons: Array.isArray(data?.lessons)
          ? data.lessons.map((lesson) => ({
            ...lesson,
            tasks: createTaskModels(level, lesson),
          }))
          : [],
      },
    ])
  );
}

function createTaskModels(level, lesson) {
  const duplicateIds = new Map();

  return (Array.isArray(lesson.tasks) ? lesson.tasks : []).map((taskText) => {
    const text = String(taskText);
    const baseId = `${level}:${lesson.id}:${hashTaskText(text)}`;
    const occurrence = duplicateIds.get(baseId) ?? 0;
    duplicateIds.set(baseId, occurrence + 1);

    return {
      id: occurrence === 0 ? baseId : `${baseId}:${occurrence + 1}`,
      text,
      completed: false,
    };
  });
}

function hashTaskText(text) {
  let hash = 2166136261;

  for (const character of text.normalize("NFC")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getLessonsForLevel(level) {
  return LEVELS[level]?.lessons ?? [];
}

function getLevelStats(level, lessons = getLessonsForLevel(level)) {
  const totalLessons = lessons.length;
  const completedLessons = getCompletedLessonsCount(lessons);
  const remainingLessons = Math.max(0, totalLessons - completedLessons);
  const mainTopics = getUniqueFocuses(lessons).length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return {
    totalLessons,
    completedLessons,
    remainingLessons,
    mainTopics,
    progressPercent,
  };
}

function setActiveLevel(level) {
  if (!LEVELS[level] || level === state.activeLevel) {
    return;
  }

  state.activeLevel = level;
  persistLastLevel(level);
  closeAllDropdowns();
  renderLevelTabs();
  renderDropdowns();
  render();
}

function handleBackToTopVisibility() {
  const shouldBeVisible = window.scrollY > 400;
  if (state.isBackToTopVisible === shouldBeVisible || !elements.backToTopButton) {
    return;
  }

  state.isBackToTopVisible = shouldBeVisible;
  elements.backToTopButton.classList.toggle("is-visible", shouldBeVisible);
}

function syncFilters() {
  const filters = getCurrentFilters();
  filters.applied.search = filters.pending.search.trim().toLowerCase();
  filters.applied.statusFilter = filters.pending.statusFilter;
  filters.applied.focusFilters = new Set(filters.pending.focusFilters);
  render();
}

function clearFilters() {
  state.filters[state.activeLevel] = createLevelFilters();

  if (elements.searchInput) {
    elements.searchInput.value = "";
  }

  closeAllDropdowns();
  renderDropdowns();
  render();
}

function renderLevelTabs() {
  if (!elements.levelTabs) {
    return;
  }

  elements.levelTabs.innerHTML = LEVEL_KEYS.map((level) => {
    const isActive = level === state.activeLevel;
    return `
      <button class="level-tab${isActive ? " is-active" : ""}" type="button" role="tab" aria-selected="${isActive}"
        data-level="${level}">
        ${level}
      </button>
    `;
  }).join("");
}

function renderDropdowns() {
  renderStatusDropdown();
  renderFocusDropdown();
}

function renderStatusDropdown() {
  if (!elements.statusDropdownMenu || !elements.statusDropdownText) {
    return;
  }

  const filters = getCurrentFilters().pending;

  elements.statusDropdownMenu.innerHTML = STATUS_OPTIONS.map((option) =>
    createDropdownOptionMarkup({
      value: option.value,
      label: option.label,
      selected: filters.statusFilter === option.value,
      multi: false,
    })
  ).join("");

  const activeStatus = STATUS_OPTIONS.find((option) => option.value === filters.statusFilter);
  elements.statusDropdownText.textContent = activeStatus?.label || "الكل";
}

function renderFocusDropdown() {
  if (!elements.focusDropdownMenu || !elements.focusDropdownText) {
    return;
  }

  const filters = getCurrentFilters().pending;
  const focuses = getUniqueFocuses(getActiveLessons());
  const noSelection = filters.focusFilters.size === 0;

  elements.focusDropdownMenu.innerHTML = [
    createDropdownOptionMarkup({
      value: "all",
      label: "الكل",
      selected: noSelection,
      multi: true,
    }),
    ...focuses.map((focus) =>
      createDropdownOptionMarkup({
        value: focus,
        label: focus,
        selected: filters.focusFilters.has(focus),
        multi: true,
      })
    ),
  ].join("");

  elements.focusDropdownText.textContent = getFocusTriggerLabel();
}

function createDropdownOptionMarkup({ value, label, selected, multi }) {
  return `
    <button
      class="dropdown-option${selected ? " is-selected" : ""}"
      type="button"
      role="option"
      aria-selected="${selected}"
      data-option-value="${escapeAttribute(value)}"
    >
      <span class="dropdown-option__label">${escapeHtml(label)}</span>
      <span class="dropdown-option__mark${multi ? " is-multi" : ""}" aria-hidden="true"></span>
    </button>
  `;
}

function toggleDropdown(name) {
  if (state.openDropdown === name) {
    closeDropdown(name);
    return;
  }

  openDropdown(name);
}

function openDropdown(name) {
  closeAllDropdowns();
  const parts = getDropdownParts(name);
  if (!parts) {
    return;
  }

  parts.trigger.setAttribute("aria-expanded", "true");
  parts.trigger.closest(".custom-dropdown")?.classList.add("is-open");
  state.openDropdown = name;
}

function closeDropdown(name) {
  const parts = getDropdownParts(name);
  if (!parts) {
    return;
  }

  parts.trigger.setAttribute("aria-expanded", "false");
  parts.trigger.closest(".custom-dropdown")?.classList.remove("is-open");
  if (state.openDropdown === name) {
    state.openDropdown = null;
  }
}

function closeAllDropdowns() {
  closeDropdown("status");
  closeDropdown("focus");
}

function getDropdownParts(name) {
  if (name === "status" && elements.statusDropdownTrigger && elements.statusDropdownMenu) {
    return { trigger: elements.statusDropdownTrigger, menu: elements.statusDropdownMenu };
  }

  if (name === "focus" && elements.focusDropdownTrigger && elements.focusDropdownMenu) {
    return { trigger: elements.focusDropdownTrigger, menu: elements.focusDropdownMenu };
  }

  return null;
}

function toggleFocusFilter(value) {
  const filters = getCurrentFilters().pending;

  if (value === "all") {
    filters.focusFilters.clear();
    return;
  }

  if (filters.focusFilters.has(value)) {
    filters.focusFilters.delete(value);
  } else {
    filters.focusFilters.add(value);
  }
}

function getFocusTriggerLabel() {
  const selected = [...getCurrentFilters().pending.focusFilters];
  if (selected.length === 0) {
    return "الكل";
  }

  if (selected.length === 1) {
    return selected[0];
  }

  return `${selected.length} محاور محددة`;
}

function render() {
  const activeLevelData = getActiveLevelData();
  if (!activeLevelData) {
    return;
  }

  syncFilterInput();
  renderDynamicText();

  const lessons = getActiveLessons();
  const stats = getLevelStats(state.activeLevel, lessons);
  const filteredLessons = getFilteredLessons();

  elements.tasksContainer.innerHTML = filteredLessons.map(createLessonCardMarkup).join("");
  elements.emptyState.hidden = filteredLessons.length > 0;
  applyPendingLessonHighlight();

  elements.totalLessons.textContent = String(stats.totalLessons);
  elements.mainFocuses.textContent = String(stats.mainTopics);
  elements.completedLessons.textContent = String(stats.completedLessons);
  elements.remainingLessons.textContent = String(stats.remainingLessons);

  elements.progressFill.style.width = `${stats.progressPercent}%`;
  elements.progressBar?.setAttribute("aria-valuenow", String(stats.progressPercent));
  elements.heroProgressText.textContent = `أنجزت ${stats.completedLessons} من ${stats.totalLessons}`;
  elements.completedSummary.textContent = `أنجزت ${stats.completedLessons} من ${stats.totalLessons}`;
  elements.heroProgressPercent.textContent = `${stats.progressPercent}%`;
  elements.resultsSummary.textContent = buildResultsSummary(filteredLessons.length, stats.totalLessons);
  elements.visibleBreakdown.textContent = `عدد الدروس الظاهرة الآن: ${filteredLessons.length}`;
}

function syncFilterInput() {
  if (elements.searchInput) {
    elements.searchInput.value = getCurrentFilters().pending.search;
  }
}

function renderDynamicText() {
  const activeLevelData = getActiveLevelData();
  const totalLessons = activeLevelData.lessons.length;

  document.title = `${GLOBAL_PAGE_TITLE} | ${state.activeLevel}`;
  elements.levelIntroTitle.textContent = activeLevelData.title;
  elements.levelIntroDescription.textContent =
    `هذه الخطة تجمع ${totalLessons} درسًا مرتبة لمستوى ${state.activeLevel} مع متابعة تقدم مستقلة وفلاتر خاصة بهذا المستوى.`;
  elements.heroPrimaryButton.href = activeLevelData.playlistUrl;
  elements.heroPrimaryButton.textContent = `مشاهدة دروس ${state.activeLevel}`;
  elements.progressTitle.textContent = `متابعة إنجاز مستوى ${state.activeLevel}`;
  elements.summaryTitle.textContent = `نظرة عامة على مستوى ${state.activeLevel}`;
  elements.lessonsTitle.textContent = `دروس مستوى ${state.activeLevel}`;
  elements.lessonsDescription.textContent =
    `كل بطاقة تعرض ما ستتعلمه في مستوى ${state.activeLevel}، الهدف الحواري، ومهام اليوم مع متابعة لحظية.`;
}

function getFilteredLessons() {
  const filters = getCurrentFilters().applied;
  const activeLevel = state.activeLevel;

  return getActiveLessons().filter((lesson) => {
    const completed = isLessonCompleted(lesson);
    const matchesStatus =
      filters.statusFilter === "all" ||
      (filters.statusFilter === "completed" && completed) ||
      (filters.statusFilter === "pending" && !completed);
    const matchesFocus = filters.focusFilters.size === 0 || filters.focusFilters.has(lesson.focus);
    const matchesSearch = createSearchableText(lesson).includes(filters.search);

    return matchesStatus && matchesFocus && matchesSearch;
  });
}

function createSearchableText(lesson) {
  return [
    lesson.title,
    lesson.focus,
    lesson.what_you_learn,
    lesson.conversational_goal,
    ...(lesson.tasks || []).map((task) => task.text),
  ]
    .join(" ")
    .toLowerCase();
}

function getUniqueFocuses(lessons) {
  return [...new Set(lessons.map((lesson) => lesson.focus).filter(Boolean))];
}

function getCompletedLessonsCount(lessons) {
  return lessons.filter(isLessonCompleted).length;
}

function isLessonCompleted(lesson) {
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  return tasks.length > 0 && tasks.every((task) => task.completed);
}

function getTaskById(level, lessonId, taskId) {
  const lesson = getLessonByLevelAndId(level, lessonId);
  return lesson?.tasks.find((task) => task.id === taskId) ?? null;
}

function getLessonStateKey(level, lessonId) {
  return `${level}:${lessonId}`;
}

function getLessonsForLevelMap(level) {
  return new Map(getLessonsForLevel(level).map((lesson) => [lesson.id, lesson]));
}

function getLessonByLevelAndId(level, lessonId) {
  return getLessonsForLevelMap(level).get(lessonId) ?? null;
}

function persistLastLevel(level) {
  safelyWriteLocalStorage(LAST_LEVEL_STORAGE_KEY, level);
}

function persistLastLesson(level, lessonId) {
  if (!LEVELS[level] || !getLessonByLevelAndId(level, lessonId)) {
    return;
  }

  safelyWriteLocalStorage(
    LAST_LESSON_STORAGE_KEY,
    JSON.stringify({
      level,
      lessonId,
    })
  );
}

function getSavedLastLesson() {
  const rawValue = safelyReadLocalStorage(LAST_LESSON_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || !LEVELS[parsed.level]) {
      return null;
    }

    const lessonId = Number(parsed.lessonId);
    if (!Number.isFinite(lessonId) || !getLessonByLevelAndId(parsed.level, lessonId)) {
      return null;
    }

    return {
      level: parsed.level,
      lessonId,
    };
  } catch (error) {
    return null;
  }
}

function getFirstIncompleteLesson(level) {
  return getLessonsForLevel(level).find((lesson) => !isLessonCompleted(lesson)) ?? null;
}

function continueLearning() {
  const savedLesson = getSavedLastLesson();
  if (savedLesson) {
    focusLesson(savedLesson.level, savedLesson.lessonId, "تم الرجوع إلى آخر درس كنت تدرسه.");
    return;
  }

  const firstIncompleteLesson = getFirstIncompleteLesson(state.activeLevel);
  if (firstIncompleteLesson) {
    focusLesson(state.activeLevel, firstIncompleteLesson.id, "تم توجيهك إلى أول درس غير مكتمل في هذا المستوى.");
    return;
  }

  const firstLesson = getLessonsForLevel(state.activeLevel)[0];
  if (firstLesson) {
    focusLesson(state.activeLevel, firstLesson.id, "أنجزت كل الدروس في هذا المستوى، لذا تم إعادتك إلى أول درس.");
    return;
  }

  setContinueLearningMessage("لا توجد دروس متاحة للمتابعة حالياً.");
}

function focusLesson(level, lessonId, message) {
  persistLastLevel(level);
  persistLastLesson(level, lessonId);

  if (state.activeLevel !== level) {
    setActiveLevel(level);
  }

  state.highlightedLessonKey = getLessonStateKey(level, lessonId);
  setContinueLearningMessage(message);
  render();

  requestAnimationFrame(() => {
    const lessonCard = elements.tasksContainer?.querySelector(
      `[data-level="${escapeSelectorValue(level)}"][data-lesson-id="${lessonId}"]`
    );

    if (!(lessonCard instanceof HTMLElement)) {
      return;
    }

    lessonCard.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
}

function applyPendingLessonHighlight() {
  if (!state.highlightedLessonKey) {
    return;
  }

  if (state.highlightTimeoutId) {
    window.clearTimeout(state.highlightTimeoutId);
  }

  state.highlightTimeoutId = window.setTimeout(() => {
    state.highlightedLessonKey = null;
    state.highlightTimeoutId = null;
    render();
  }, LESSON_HIGHLIGHT_DURATION);
}

function setContinueLearningMessage(message) {
  if (elements.continueLearningNote) {
    elements.continueLearningNote.textContent = message;
  }
}

function safelyReadLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safelyWriteLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage write failures so the app keeps working.
  }
}

function escapeSelectorValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildResultsSummary(visibleCount, totalCount) {
  const filters = getCurrentFilters().applied;

  if (!filters.search && filters.statusFilter === "all" && filters.focusFilters.size === 0) {
    return `كل الدروس متاحة الآن: ${visibleCount} من ${totalCount}`;
  }

  return `النتائج المطابقة الحالية: ${visibleCount} من ${totalCount}`;
}

function createLessonCardMarkup(lesson) {
  const activeLevel = state.activeLevel;
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  const completedTasks = tasks.filter((task) => task.completed).length;
  const completed = completedTasks === tasks.length && tasks.length > 0;
  const shouldHighlight = state.highlightedLessonKey === getLessonStateKey(activeLevel, lesson.id);

  return `
    <article class="task-card${completed ? " is-completed" : ""}${shouldHighlight ? " is-resuming" : ""}"
      data-lesson-id="${lesson.id}" data-level="${activeLevel}">
      <div class="task-topline">
        <span class="task-day">اليوم ${lesson.id}</span>
        <span class="status-pill${completed ? " status-pill--completed" : ""}">
          ${completed ? "مكتمل" : `أنجزت ${completedTasks} من ${tasks.length}`}
        </span>
      </div>

      <div class="task-block">
        <h3 class="task-title">${escapeHtml(lesson.title)}</h3>
        <p class="task-focus">${escapeHtml(lesson.focus)}</p>
      </div>

      <div class="task-block">
        <span class="task-label">ما ستتعلمه</span>
        <p class="task-text">${escapeHtml(lesson.what_you_learn)}</p>
      </div>

      <div class="task-block">
        <span class="task-label">الهدف الحواري</span>
        <p class="task-text">${escapeHtml(lesson.conversational_goal)}</p>
      </div>

      <div class="task-block">
        <span class="task-label">مهام اليوم</span>
        <div class="lesson-tasks">
          ${tasks.length > 0
      ? tasks.map((task) => createTaskItemMarkup(lesson.id, task)).join("")
      : `<p class="task-text">لا توجد مهام محفوظة لهذا الدرس حاليًا.</p>`}
        </div>
      </div>

      <div class="task-footer">
        <span class="lesson-state">${completed
      ? "اكتمل هذا الدرس بعد إنهاء جميع المهام."
      : "أكمل كل المهام ليُحتسب الدرس منجزًا."}</span>
        <a class="button button-secondary btn-secondary-glass lesson-link" href="${escapeAttribute(
        lesson.url || getActiveLevelData().playlistUrl
      )}" target="_blank" rel="noopener noreferrer">مشاهدة الدرس</a>
      </div>
    </article>
  `;
}

function createTaskItemMarkup(lessonId, task) {
  const activeLevel = state.activeLevel;
  const inputId = `task-${task.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return `
    <label class="lesson-task${task.completed ? " is-checked" : ""}" for="${inputId}">
      <span class="task-toggle">
        <input id="${inputId}" type="checkbox" data-lesson-id="${lessonId}" data-task-id="${escapeAttribute(task.id)}" ${task.completed ? "checked" : ""} />
        <span class="toggle-mark" aria-hidden="true"></span>
      </span>
      <span class="lesson-task__text">${escapeHtml(task.text)}</span>
    </label>
  `;
}

function migrateStoredProgress() {
  const legacyPatterns = [
    { pattern: /^b1-lesson-(\d+)-task-(\d+)$/, level: "B1" },
    { pattern: /^b1-([AB]\d+)-(\d+)-task-(\d+)$/i, levelIndex: 1, lessonIndex: 2, taskIndex: 3 },
    { pattern: /^([AB]\d+)-(\d+)-task-(\d+)$/i, levelIndex: 1, lessonIndex: 2, taskIndex: 3 },
  ];

  const storedCompletion = readStoredTaskCompletion();
  const migratedCompletion = { ...storedCompletion };

  for (const { key, value } of getStoredEntries()) {
    for (const config of legacyPatterns) {
      const match = key.match(config.pattern);
      if (!match) {
        continue;
      }

      const level = config.level ?? match[config.levelIndex].toUpperCase();
      const lessonId = Number(match[config.lessonIndex ?? 1]);
      const taskIndex = Number(match[config.taskIndex ?? 2]);

      const task = getLessonByLevelAndId(level, lessonId)?.tasks[taskIndex];
      if (!task || Object.prototype.hasOwnProperty.call(migratedCompletion, task.id)) {
        continue;
      }

      migratedCompletion[task.id] = parseStoredBoolean(value);

      break;
    }
  }

  safelyWriteLocalStorage(TASK_COMPLETION_STORAGE_KEY, JSON.stringify(migratedCompletion));
}

function getStoredEntries() {
  try {
    return Array.from({ length: localStorage.length }, (_, index) => {
      const key = localStorage.key(index);
      return key ? { key, value: localStorage.getItem(key) } : null;
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function restoreTaskCompletion() {
  const storedCompletion = readStoredTaskCompletion();

  Object.values(LEVELS).forEach(({ lessons }) => {
    lessons.forEach((lesson) => {
      lesson.tasks.forEach((task) => {
        task.completed = parseStoredBoolean(storedCompletion[task.id]);
      });
    });
  });
}

function readStoredTaskCompletion() {
  const rawValue = safelyReadLocalStorage(TASK_COMPLETION_STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function parseStoredBoolean(value) {
  return value === true || value === "true";
}

function persistTaskCompletion() {
  const completion = {};

  Object.values(LEVELS).forEach(({ lessons }) => {
    lessons.forEach((lesson) => {
      lesson.tasks.forEach((task) => {
        completion[task.id] = task.completed === true;
      });
    });
  });

  safelyWriteLocalStorage(TASK_COMPLETION_STORAGE_KEY, JSON.stringify(completion));
}

function renderErrorState(error) {
  console.error("Failed to load lesson data:", error);
  elements.tasksContainer.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent =
    "تعذّر تحميل ملفات الخطة. تأكد من وجود ملفات الدروس داخل src/data ثم أعد المحاولة.";
  elements.resultsSummary.textContent = "لا توجد بيانات متاحة حاليًا.";
  elements.visibleBreakdown.textContent = "عدد الدروس الظاهرة الآن: 0";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
