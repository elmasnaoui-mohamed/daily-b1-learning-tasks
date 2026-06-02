const DATA_URL = "./src/data/b1Lessons.json";
const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "completed", label: "المنجز" },
  { value: "pending", label: "غير المنجز" },
];

const state = {
  plan: null,
  lessons: [],
  pending: {
    search: "",
    statusFilter: "all",
    focusFilters: new Set(),
  },
  applied: {
    search: "",
    statusFilter: "all",
    focusFilters: new Set(),
  },
  openDropdown: null,
};

const elements = {
  playlistButton: document.querySelector("#playlistButton"),
  heroTitle: document.querySelector("#heroTitle"),
  heroDescription: document.querySelector("#heroDescription"),
  tasksContainer: document.querySelector("#tasksContainer"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  statusDropdownTrigger: document.querySelector("#statusDropdownTrigger"),
  statusDropdownText: document.querySelector("#statusDropdownText"),
  statusDropdownMenu: document.querySelector("#statusDropdownMenu"),
  focusDropdownTrigger: document.querySelector("#focusDropdownTrigger"),
  focusDropdownText: document.querySelector("#focusDropdownText"),
  focusDropdownMenu: document.querySelector("#focusDropdownMenu"),
  progressFill: document.querySelector("#progressFill"),
  heroProgressText: document.querySelector("#heroProgressText"),
  heroProgressPercent: document.querySelector("#heroProgressPercent"),
  completedSummary: document.querySelector("#completedSummary"),
  progressBar: document.querySelector(".progress-bar"),
  resultsSummary: document.querySelector("#resultsSummary"),
  visibleBreakdown: document.querySelector("#visibleBreakdown"),
  totalLessons: document.querySelector("#totalLessons"),
  mainFocuses: document.querySelector("#mainFocuses"),
  completedLessons: document.querySelector("#completedLessons"),
  remainingLessons: document.querySelector("#remainingLessons"),
  lessonsDescription: document.querySelector("#lessonsDescription"),
  applyFiltersButton: document.querySelector("#applyFiltersButton"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
};

bootstrap();

async function bootstrap() {
  bindEvents();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const plan = await response.json();
    state.plan = plan;
    state.lessons = Array.isArray(plan.lessons) ? plan.lessons : [];

    hydrateStaticContent();
    renderDropdowns();
    render();
  } catch (error) {
    renderErrorState(error);
  }
}

function bindEvents() {
  elements.searchInput?.addEventListener("input", (event) => {
    state.pending.search = event.target.value.trim().toLowerCase();
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

    state.pending.statusFilter = option.dataset.optionValue || "all";
    closeDropdown("status");
    renderDropdowns();
  });

  elements.focusDropdownMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
    const option = event.target.closest("[data-option-value]");
    if (!(option instanceof HTMLElement)) {
      return;
    }

    toggleFocusFilter(option.dataset.optionValue || "all");
    renderDropdowns();
  });

  elements.applyFiltersButton?.addEventListener("click", () => {
    applyFilters();
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

    const storageKey = getTaskStorageKey(lessonId, taskIndex);
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
}

function applyFilters() {
  state.applied.search = state.pending.search;
  state.applied.statusFilter = state.pending.statusFilter;
  state.applied.focusFilters = new Set(state.pending.focusFilters);
  closeAllDropdowns();
  render();
}

function clearFilters() {
  state.pending.search = "";
  state.pending.statusFilter = "all";
  state.pending.focusFilters.clear();
  state.applied.search = "";
  state.applied.statusFilter = "all";
  state.applied.focusFilters.clear();

  if (elements.searchInput) {
    elements.searchInput.value = "";
  }

  closeAllDropdowns();
  renderDropdowns();
  render();
}

function hydrateStaticContent() {
  const { playlist_title: playlistTitle, playlist_url: playlistUrl, total_lessons: totalLessons } = state.plan;

  document.title = `${playlistTitle} | لوحة B1`;
  elements.playlistButton.href = playlistUrl;
  elements.heroTitle.textContent = `رحلة ${totalLessons} درسًا نحو B1 بثبات ووضوح`;
  elements.heroDescription.textContent =
    "كل درس تقطعه اليوم يقرّبك خطوة من الحديث بثقة. التزم بالخطة، أنجز المهام، ودع التقدّم اليومي يصنع الفرق.";
  elements.lessonsDescription.textContent =
    "كل بطاقة تعرض ما ستتعلمه، الهدف الحواري، ومهام اليوم مع حفظ مستقل لكل مهمة في المتصفح.";
}

function renderDropdowns() {
  renderStatusDropdown();
  renderFocusDropdown();
}

function renderStatusDropdown() {
  if (!elements.statusDropdownMenu || !elements.statusDropdownText) {
    return;
  }

  elements.statusDropdownMenu.innerHTML = STATUS_OPTIONS.map((option) =>
    createDropdownOptionMarkup({
      value: option.value,
      label: option.label,
      selected: state.pending.statusFilter === option.value,
      multi: false,
    })
  ).join("");

  const activeStatus = STATUS_OPTIONS.find((option) => option.value === state.pending.statusFilter);
  elements.statusDropdownText.textContent = activeStatus?.label || "الكل";
}

function renderFocusDropdown() {
  if (!elements.focusDropdownMenu || !elements.focusDropdownText) {
    return;
  }

  const focuses = getUniqueFocuses(state.lessons);
  const noSelection = state.pending.focusFilters.size === 0;

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
        selected: state.pending.focusFilters.has(focus),
        multi: true,
      })
    )
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
  if (value === "all") {
    state.pending.focusFilters.clear();
    return;
  }

  if (state.pending.focusFilters.has(value)) {
    state.pending.focusFilters.delete(value);
  } else {
    state.pending.focusFilters.add(value);
  }
}

function getFocusTriggerLabel() {
  const selected = [...state.pending.focusFilters];
  if (selected.length === 0) {
    return "الكل";
  }

  if (selected.length === 1) {
    return selected[0];
  }

  return `${selected.length} محاور محددة`;
}

function render() {
  if (!state.plan) {
    return;
  }

  const totalLessons = state.lessons.length;
  const completedLessons = getCompletedLessonsCount(state.lessons);
  const remainingLessons = Math.max(0, totalLessons - completedLessons);
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const filteredLessons = getFilteredLessons();
  const uniqueFocuses = getUniqueFocuses(state.lessons);

  elements.tasksContainer.innerHTML = filteredLessons.map(createLessonCardMarkup).join("");
  elements.emptyState.hidden = filteredLessons.length > 0;

  elements.totalLessons.textContent = String(state.plan.total_lessons ?? totalLessons);
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

function getFilteredLessons() {
  return state.lessons.filter((lesson) => {
    const completed = isLessonCompleted(lesson);
    const matchesStatus =
      state.applied.statusFilter === "all" ||
      (state.applied.statusFilter === "completed" && completed) ||
      (state.applied.statusFilter === "pending" && !completed);
    const matchesFocus =
      state.applied.focusFilters.size === 0 || state.applied.focusFilters.has(lesson.focus);
    const matchesSearch = createSearchableText(lesson).includes(state.applied.search);

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
  return tasks.length > 0 && tasks.every((_, taskIndex) => isTaskCompleted(lesson.id, taskIndex));
}

function isTaskCompleted(lessonId, taskIndex) {
  return localStorage.getItem(getTaskStorageKey(lessonId, taskIndex)) === "true";
}

function getTaskStorageKey(lessonId, taskIndex) {
  return `b1-lesson-${lessonId}-task-${taskIndex}`;
}

function buildResultsSummary(visibleCount, totalCount) {
  if (
    !state.applied.search &&
    state.applied.statusFilter === "all" &&
    state.applied.focusFilters.size === 0
  ) {
    return `كل الدروس متاحة الآن: ${visibleCount} من ${totalCount}`;
  }

  return `النتائج المطابقة الحالية: ${visibleCount} من ${totalCount}`;
}

function createLessonCardMarkup(lesson) {
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  const completedTasks = tasks.filter((_, taskIndex) => isTaskCompleted(lesson.id, taskIndex)).length;
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
          ${tasks.map((task, taskIndex) => createTaskItemMarkup(lesson.id, taskIndex, task)).join("")}
        </div>
      </div>

      <div class="task-footer">
        <span class="lesson-state">${completed ? "اكتمل هذا الدرس بعد إنهاء جميع المهام." : "أكمل كل المهام ليُحتسب الدرس منجزًا."}</span>
        <a class="button button-secondary lesson-link" href="${escapeAttribute(
          state.plan.playlist_url
        )}" target="_blank" rel="noopener noreferrer">مشاهدة الدرس</a>
      </div>
    </article>
  `;
}

function createTaskItemMarkup(lessonId, taskIndex, task) {
  const checked = isTaskCompleted(lessonId, taskIndex);
  const inputId = `lesson-${lessonId}-task-${taskIndex}`;

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

function renderErrorState(error) {
  console.error("Failed to load B1 lesson data:", error);
  elements.tasksContainer.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = "تعذّر تحميل ملف الخطة. تأكد من وجود src/data/b1Lessons.json ثم أعد المحاولة.";
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
