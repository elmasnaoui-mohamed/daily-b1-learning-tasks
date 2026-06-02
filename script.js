const DATA_URL = "./src/data/b1Lessons.json";

const state = {
  plan: null,
  lessons: [],
  search: "",
  statusFilter: "all",
  focusFilter: "all",
};

const elements = {
  playlistButton: document.querySelector("#playlistButton"),
  playlistTitle: document.querySelector("#playlistTitle"),
  heroTitle: document.querySelector("#heroTitle"),
  heroDescription: document.querySelector("#heroDescription"),
  summaryPlaylistTitle: document.querySelector("#summaryPlaylistTitle"),
  tasksContainer: document.querySelector("#tasksContainer"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  statusFilters: document.querySelector("#statusFilters"),
  focusFilters: document.querySelector("#focusFilters"),
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
    renderFocusFilters();
    render();
  } catch (error) {
    renderErrorState(error);
  }
}

function bindEvents() {
  elements.searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.statusFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-group='status']");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    state.statusFilter = button.dataset.filterValue || "all";
    updateFilterButtons(elements.statusFilters, state.statusFilter);
    render();
  });

  elements.focusFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-group='focus']");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    state.focusFilter = button.dataset.filterValue || "all";
    updateFilterButtons(elements.focusFilters, state.focusFilter);
    render();
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
}

function hydrateStaticContent() {
  const { playlist_title: playlistTitle, playlist_url: playlistUrl, total_lessons: totalLessons } = state.plan;

  document.title = `${playlistTitle} | لوحة B1`;
  elements.playlistButton.href = playlistUrl;
  elements.playlistTitle.textContent = playlistTitle;
  elements.summaryPlaylistTitle.textContent = playlistTitle;
  elements.heroTitle.textContent = `رحلة ${totalLessons} درسًا نحو B1 بثبات ووضوح`;
  elements.heroDescription.textContent =
    "كل شيء في الصفحة الآن يُشتق من ملف JSON واحد: التقدم، الملخص، الفلاتر، والبطاقات نفسها.";
  elements.lessonsDescription.textContent =
    "كل بطاقة تعرض ما ستتعلمه، الهدف الحواري، ومهام اليوم مع حفظ مستقل لكل مهمة في المتصفح.";
  updateFilterButtons(elements.statusFilters, state.statusFilter);
}

function renderFocusFilters() {
  const focuses = getUniqueFocuses(state.lessons);
  elements.focusFilters.innerHTML = [
    `<button class="filter-button is-active" type="button" data-filter-group="focus" data-filter-value="all">الكل</button>`,
    ...focuses.map(
      (focus) =>
        `<button class="filter-button" type="button" data-filter-group="focus" data-filter-value="${escapeAttribute(
          focus
        )}">${escapeHtml(focus)}</button>`
    ),
  ].join("");

  updateFilterButtons(elements.focusFilters, state.focusFilter);
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
      state.statusFilter === "all" ||
      (state.statusFilter === "completed" && completed) ||
      (state.statusFilter === "pending" && !completed);
    const matchesFocus = state.focusFilter === "all" || lesson.focus === state.focusFilter;
    const matchesSearch = createSearchableText(lesson).includes(state.search);

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
  if (!state.search && state.statusFilter === "all" && state.focusFilter === "all") {
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
          ${tasks
            .map((task, taskIndex) => createTaskItemMarkup(lesson.id, taskIndex, task))
            .join("")}
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

function updateFilterButtons(container, activeValue) {
  container?.querySelectorAll(".filter-button").forEach((button) => {
    const isActive = button.dataset.filterValue === activeValue;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderErrorState(error) {
  console.error("Failed to load B1 lesson data:", error);
  elements.playlistTitle.textContent = "تعذّر تحميل الخطة";
  elements.summaryPlaylistTitle.textContent = "تعذّر تحميل الخطة";
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
