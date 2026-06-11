import b1Lessons from "./src/data/b1Lessons.json" with { type: "json" };
import b2Lessons from "./src/data/b2Lessons.json" with { type: "json" };

const LEVELS = {
  B1: {
    label: "B1",
    title: b1Lessons.playlist_title,
    playlistUrl: b1Lessons.playlist_url,
    lessons: Array.isArray(b1Lessons.lessons) ? b1Lessons.lessons : [],
  },
  B2: {
    label: "B2",
    title: b2Lessons.playlist_title,
    playlistUrl: b2Lessons.playlist_url,
    lessons: Array.isArray(b2Lessons.lessons) ? b2Lessons.lessons : [],
  },
};

const LEVEL_KEYS = Object.keys(LEVELS);

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "completed", label: "المنجز" },
  { value: "pending", label: "غير المنجز" },
];

const GLOBAL_PAGE_TITLE = "خطة تعلم اللغة الألمانية متعددة المستويات";

const state = {
  activeLevel: LEVEL_KEYS[0] || "B1",
  filters: Object.fromEntries(LEVEL_KEYS.map((level) => [level, createLevelFilters()])),
  openDropdown: null,
  isBackToTopVisible: false,
};

const elements = {
  heroPrimaryButton: document.querySelector("#heroPrimaryButton"),
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

  elements.tasksContainer?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
      return;
    }

    const lessonId = Number(input.dataset.lessonId);
    const taskIndex = Number(input.dataset.taskIndex);

    if (!Number.isFinite(lessonId) || !Number.isFinite(taskIndex)) {
      return;
    }

    const storageKey = getTaskStorageKey(state.activeLevel, lessonId, taskIndex);
    if (input.checked) {
      localStorage.setItem(storageKey, "true");
    } else {
      localStorage.removeItem(storageKey);
    }

    render();
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

function getCurrentFilters() {
  return state.filters[state.activeLevel];
}

function getActiveLevelData() {
  return LEVELS[state.activeLevel];
}

function getActiveLessons() {
  return getActiveLevelData().lessons;
}

function setActiveLevel(level) {
  if (!LEVELS[level] || level === state.activeLevel) {
    return;
  }

  state.activeLevel = level;
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
  const totalLessons = lessons.length;
  const completedLessons = getCompletedLessonsCount(lessons);
  const remainingLessons = Math.max(0, totalLessons - completedLessons);
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const filteredLessons = getFilteredLessons();
  const uniqueFocuses = getUniqueFocuses(lessons);

  elements.tasksContainer.innerHTML = filteredLessons.map(createLessonCardMarkup).join("");
  elements.emptyState.hidden = filteredLessons.length > 0;

  elements.totalLessons.textContent = String(totalLessons);
  elements.mainFocuses.textContent = String(uniqueFocuses.length);
  elements.completedLessons.textContent = String(completedLessons);
  elements.remainingLessons.textContent = String(remainingLessons);

  elements.progressFill.style.width = `${progressPercent}%`;
  elements.progressBar?.setAttribute("aria-valuenow", String(progressPercent));
  elements.heroProgressText.textContent = `أنجزت ${completedLessons} من ${totalLessons}`;
  elements.completedSummary.textContent = `أنجزت ${completedLessons} من ${totalLessons}`;
  elements.heroProgressPercent.textContent = `${progressPercent}%`;
  elements.resultsSummary.textContent = buildResultsSummary(filteredLessons.length, totalLessons);
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
    ...(lesson.tasks || []),
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
  return tasks.length > 0 && tasks.every((_, taskIndex) => isTaskCompleted(state.activeLevel, lesson.id, taskIndex));
}

function isTaskCompleted(level, lessonId, taskIndex) {
  return localStorage.getItem(getTaskStorageKey(level, lessonId, taskIndex)) === "true";
}

function getTaskStorageKey(level, lessonId, taskIndex) {
  return `${level}-${lessonId}-task-${taskIndex}`;
}

function buildResultsSummary(visibleCount, totalCount) {
  const filters = getCurrentFilters().applied;

  if (!filters.search && filters.statusFilter === "all" && filters.focusFilters.size === 0) {
    return `كل الدروس متاحة الآن: ${visibleCount} من ${totalCount}`;
  }

  return `النتائج المطابقة الحالية: ${visibleCount} من ${totalCount}`;
}

function createLessonCardMarkup(lesson) {
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  const completedTasks = tasks.filter((_, taskIndex) =>
    isTaskCompleted(state.activeLevel, lesson.id, taskIndex)
  ).length;
  const completed = completedTasks === tasks.length && tasks.length > 0;

  return `
    <article class="task-card${completed ? " is-completed" : ""}" data-lesson-id="${lesson.id}">
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
            ? tasks.map((task, taskIndex) => createTaskItemMarkup(lesson.id, taskIndex, task)).join("")
            : `<p class="task-text">لا توجد مهام محفوظة لهذا الدرس حاليًا.</p>`}
        </div>
      </div>

      <div class="task-footer">
        <span class="lesson-state">${completed
          ? "اكتمل هذا الدرس بعد إنهاء جميع المهام."
          : "أكمل كل المهام ليُحتسب الدرس منجزًا."}</span>
        <a class="button button-secondary btn-secondary-glass lesson-link" href="${escapeAttribute(
          getActiveLevelData().playlistUrl
        )}" target="_blank" rel="noopener noreferrer">مشاهدة الدرس</a>
      </div>
    </article>
  `;
}

function createTaskItemMarkup(lessonId, taskIndex, task) {
  const checked = isTaskCompleted(state.activeLevel, lessonId, taskIndex);
  const inputId = `${state.activeLevel.toLowerCase()}-lesson-${lessonId}-task-${taskIndex}`;

  return `
    <label class="lesson-task${checked ? " is-checked" : ""}" for="${inputId}">
      <span class="task-toggle">
        <input id="${inputId}" type="checkbox" data-lesson-id="${lessonId}" data-task-index="${taskIndex}" ${checked ? "checked" : ""} />
        <span class="toggle-mark" aria-hidden="true"></span>
      </span>
      <span class="lesson-task__text">${escapeHtml(task)}</span>
    </label>
  `;
}

function migrateStoredProgress() {
  const legacyPatterns = [
    { pattern: /^b1-lesson-(\d+)-task-(\d+)$/, level: "B1" },
    { pattern: /^b1-(B\d+)-(\d+)-task-(\d+)$/, levelIndex: 1, lessonIndex: 2, taskIndex: 3 },
    { pattern: /^(B\d+)-(\d+)-task-(\d+)$/, levelIndex: 1, lessonIndex: 2, taskIndex: 3 },
  ];

  const updates = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) {
      continue;
    }

    for (const config of legacyPatterns) {
      const match = key.match(config.pattern);
      if (!match) {
        continue;
      }

      const level = config.level ?? match[config.levelIndex];
      const lessonId = Number(match[config.lessonIndex ?? 1]);
      const taskIndex = Number(match[config.taskIndex ?? 2]);

      if (!LEVELS[level]) {
        continue;
      }

      const nextKey = getTaskStorageKey(level, lessonId, taskIndex);
      if (nextKey !== key && localStorage.getItem(key) === "true" && localStorage.getItem(nextKey) !== "true") {
        updates.push({ key: nextKey, value: "true" });
      }

      break;
    }
  }

  updates.forEach(({ key, value }) => {
    localStorage.setItem(key, value);
  });
}

function renderErrorState(error) {
  console.error("Failed to load lesson data:", error);
  elements.tasksContainer.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent =
    "تعذّر تحميل ملفات الخطة. تأكد من وجود src/data/b1Lessons.json و src/data/b2Lessons.json ثم أعد المحاولة.";
  elements.resultsSummary.textContent = "لا توجد بيانات متاحة حاليًا.";
  elements.visibleBreakdown.textContent = "عدد الدروس الظاهرة الآن: 0";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
