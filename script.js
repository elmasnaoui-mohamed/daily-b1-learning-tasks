import {
  COURSE_LEVELS,
  LEVEL_KEYS,
  VALIDATION_REPORT,
  getLesson,
  getLessonPosition,
  getYoutubeEmbedUrl,
} from "./src/js/course-data.js";
import { createProgressStore } from "./src/js/progress-store.js";
import { loadLevelDocumentation } from "./src/js/documentation-data.js";

const BACK_TO_TOP_THRESHOLD = 500;
const BACK_TO_TOP_COLLISION_SELECTOR = "a, button:not(#backToTopButton), input, select, textarea, .site-footer p";
const LESSON_VIEW_KEY = "germanLearning:lesson-view:v1";
const progressStore = createProgressStore(COURSE_LEVELS);
const savedVisit = progressStore.getLastVisited();
const state = {
  activeLevel: COURSE_LEVELS[savedVisit?.level] ? savedVisit.level : LEVEL_KEYS[0],
  filters: Object.fromEntries(LEVEL_KEYS.map((level) => [level, { search: "", status: "all", focus: "all" }])),
  toastTimer: null,
  backToTopFrame: null,
  lessonMode: getLessonViewPreference(),
  documentationLevels: new Map(),
};

const elements = {
  loading: document.querySelector("#loadingState"),
  error: document.querySelector("#errorState"),
  errorMessage: document.querySelector("#errorMessage"),
  app: document.querySelector("#appContent"),
  dashboard: document.querySelector("#dashboardView"),
  lessonView: document.querySelector("#lessonView"),
  continueButton: document.querySelector("#continueButton"),
  levelTabs: document.querySelector("#levelTabs"),
  activeLevelBadge: document.querySelector("#activeLevelBadge"),
  levelTitle: document.querySelector("#levelTitle"),
  levelDescription: document.querySelector("#levelDescription"),
  levelPercent: document.querySelector("#levelPercent"),
  levelProgressRing: document.querySelector("#levelProgressRing"),
  overallTitle: document.querySelector("#overallTitle"),
  overallLessonCount: document.querySelector("#overallLessonCount"),
  overallTaskCount: document.querySelector("#overallTaskCount"),
  overallProgressBar: document.querySelector("#overallProgressBar"),
  overallProgressFill: document.querySelector("#overallProgressFill"),
  completedLessons: document.querySelector("#completedLessons"),
  remainingLessons: document.querySelector("#remainingLessons"),
  completedTasks: document.querySelector("#completedTasks"),
  lessonsTitle: document.querySelector("#lessonsTitle"),
  resultsSummary: document.querySelector("#resultsSummary"),
  filtersForm: document.querySelector("#filtersForm"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  focusFilter: document.querySelector("#focusFilter"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  emptyResetButton: document.querySelector("#emptyResetButton"),
  lessonGrid: document.querySelector("#lessonGrid"),
  emptyState: document.querySelector("#emptyState"),
  toast: document.querySelector("#toast"),
  backToTopButton: document.querySelector("#backToTopButton"),
};

bootstrap();

function bootstrap() {
  try {
    bindEvents();
    if (!VALIDATION_REPORT.valid) {
      showFatalError(`وجدنا مشكلة في بيانات الدروس: ${VALIDATION_REPORT.errors.join(" ")}`);
      return;
    }

    if (VALIDATION_REPORT.warnings.length) console.warn("Lesson data warnings:", VALIDATION_REPORT.warnings);
    elements.loading.hidden = true;
    elements.app.hidden = false;

    if (!location.hash) {
      history.replaceState(null, "", levelHref(state.activeLevel));
    }
    handleRoute();
  } catch (error) {
    console.error("Application initialization failed:", error);
    showFatalError("حدث خطأ غير متوقع أثناء تجهيز منصة التعلم.");
  } finally {
    hideAppLoader();
  }
}

function hideAppLoader() {
  const loader = document.querySelector("#app-loader");
  if (!loader) return;

  let removed = false;
  const removeLoader = () => {
    if (removed) return;
    removed = true;
    loader.remove();
  };

  loader.classList.add("is-hidden");
  loader.addEventListener("transitionend", removeLoader, { once: true });
  window.setTimeout(removeLoader, 300);
}

function bindEvents() {
  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("scroll", handleBackToTopScroll, { passive: true });
  window.addEventListener("resize", handleBackToTopScroll);
  elements.continueButton?.addEventListener("click", openContinueLesson);
  elements.backToTopButton?.addEventListener("click", scrollToTop);
  updateBackToTopVisibility();

  elements.searchInput?.addEventListener("input", (event) => {
    currentFilters().search = event.target.value;
    renderLessonList();
  });
  setupCustomSelect(elements.statusFilter);
  setupCustomSelect(elements.focusFilter);
  elements.statusFilter?.addEventListener("change", (event) => {
    currentFilters().status = event.target.value;
    syncCustomSelect(event.target);
    renderLessonList();
  });
  elements.focusFilter?.addEventListener("change", (event) => {
    currentFilters().focus = event.target.value;
    syncCustomSelect(event.target);
    renderLessonList();
  });
  elements.filtersForm?.addEventListener("reset", (event) => {
    event.preventDefault();
    resetFilters();
  });
  elements.emptyResetButton?.addEventListener("click", resetFilters);

  elements.lessonView?.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-task-id]");
    if (!(checkbox instanceof HTMLInputElement)) return;
    const lesson = getLesson(state.activeLevel, checkbox.dataset.lessonId);
    const wasCompleted = lesson ? progressStore.getLessonStats(lesson).completed : false;
    progressStore.setTaskComplete(checkbox.dataset.taskId, checkbox.checked);
    refreshLessonProgress(state.activeLevel, checkbox.dataset.lessonId, {
      scrollToNavigation: checkbox.checked && !wasCompleted,
    });
    showToast(checkbox.checked ? "تم حفظ إنجاز المهمة" : "تم تحديث تقدم المهمة");
  });

  elements.lessonView?.addEventListener("click", (event) => {
    const timestampLink = event.target.closest("[data-video-time]");
    if (timestampLink instanceof HTMLAnchorElement) {
      const seconds = Number(timestampLink.dataset.videoTime);
      const iframe = elements.lessonView.querySelector(".video-frame iframe");
      if (Number.isFinite(seconds) && iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
        event.preventDefault();
        activateLessonMode("video", { save: true, focus: false });
        iframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }), "https://www.youtube-nocookie.com");
        iframe.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      }
      return;
    }

    const readingAnchor = event.target.closest("[data-reading-anchor]");
    if (readingAnchor instanceof HTMLAnchorElement) {
      event.preventDefault();
      const target = elements.lessonView.querySelector(`#${escapeSelector(readingAnchor.dataset.readingAnchor)}`);
      target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      return;
    }

    const modeButton = event.target.closest("[data-lesson-mode]");
    if (modeButton instanceof HTMLButtonElement) {
      activateLessonMode(modeButton.dataset.lessonMode, { save: true, focus: true });
      return;
    }

    const returnToVideo = event.target.closest("[data-return-video]");
    if (returnToVideo instanceof HTMLButtonElement) {
      activateLessonMode("video", { save: true, focus: true });
      return;
    }

    const completionButton = event.target.closest("[data-complete-lesson]");
    if (!(completionButton instanceof HTMLButtonElement)) return;
    const lesson = getLesson(state.activeLevel, completionButton.dataset.completeLesson);
    if (!lesson) return;
    progressStore.setLessonComplete(lesson, true);
    refreshLessonProgress(state.activeLevel, lesson.id, { scrollToNavigation: true });
    showToast("أحسنت! اكتمل الدرس وحُفظ تقدمك");
  });

  elements.lessonView?.addEventListener("keydown", handleLessonTabKeydown);
}

function handleBackToTopScroll() {
  if (state.backToTopFrame !== null) return;

  state.backToTopFrame = window.requestAnimationFrame(() => {
    state.backToTopFrame = null;
    updateBackToTopVisibility();
  });
}

function updateBackToTopVisibility() {
  const shouldShow = window.scrollY >= BACK_TO_TOP_THRESHOLD && !backToTopOverlapsControl();
  elements.backToTopButton?.classList.toggle("is-visible", shouldShow);
}

function backToTopOverlapsControl() {
  const button = elements.backToTopButton;
  if (!button || !window.matchMedia("(max-width: 640px)").matches) return false;

  const style = window.getComputedStyle(button);
  const left = Number.parseFloat(style.left) || 0;
  const bottom = Number.parseFloat(style.bottom) || 0;
  const buttonRect = {
    left,
    right: left + button.offsetWidth,
    top: window.innerHeight - bottom - button.offsetHeight,
    bottom: window.innerHeight - bottom,
  };

  return Array.from(document.querySelectorAll(BACK_TO_TOP_COLLISION_SELECTOR)).some((control) => {
    const rect = control.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
    return !(
      buttonRect.right < rect.left ||
      buttonRect.left > rect.right ||
      buttonRect.bottom < rect.top ||
      buttonRect.top > rect.bottom
    );
  });
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

function handleRoute() {
  const route = parseRoute(location.hash);
  if (!route) {
    history.replaceState(null, "", levelHref(state.activeLevel));
    renderDashboard();
    return;
  }

  state.activeLevel = route.level;
  if (route.view === "lesson") {
    const lesson = getLesson(route.level, route.lessonId);
    if (!lesson) {
      showFatalError("لم نتمكن من العثور على هذا الدرس. ربما تغيّر الرابط.", false);
      return;
    }
    progressStore.setLastVisited(route.level, lesson.id);
    renderLessonDetail(route.level, lesson.id);
  } else {
    renderDashboard();
  }

  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== "level" || !COURSE_LEVELS[parts[1]]) return null;
  if (parts.length === 2) return { view: "dashboard", level: parts[1] };
  if (parts[2] === "lesson" && parts[3] != null) return { view: "lesson", level: parts[1], lessonId: parts[3] };
  return null;
}

function renderDashboard() {
  elements.error.hidden = true;
  elements.app.hidden = false;
  elements.dashboard.hidden = false;
  elements.lessonView.hidden = true;
  document.title = `${state.activeLevel} | Deutsch mit Mira`;
  renderGlobalProgress();
  renderLevelTabs();
  renderLevelSummary();
  renderFilters();
  renderLessonList();
  preloadDocumentationForLevel(state.activeLevel);
}

function renderGlobalProgress() {
  const overall = progressStore.getOverallStats();
  elements.overallTitle.textContent = `${overall.percent}%`;
  elements.overallLessonCount.textContent = `${overall.completedLessons} من ${overall.totalLessons} درس`;
  elements.overallTaskCount.textContent = `${overall.completedTasks} من ${overall.totalTasks} مهمة مكتملة`;
  setProgress(elements.overallProgressBar, elements.overallProgressFill, overall.percent);
}

function renderLevelTabs() {
  elements.levelTabs.innerHTML = LEVEL_KEYS.map((levelKey) => {
    const level = COURSE_LEVELS[levelKey];
    const stats = progressStore.getLevelStats(level);
    const active = levelKey === state.activeLevel;
    return `<div class="level-card${active ? " is-active" : ""}">
      <a class="level-tab" href="${levelHref(levelKey)}"${active ? ' aria-current="page"' : ""}>
        <span class="level-tab__name">${levelKey}</span>
        <span class="level-tab__meta">${stats.percent}% مكتمل</span>
        <span class="mini-track" aria-hidden="true"><span style="width:${stats.percent}%"></span></span>
      </a>
      <a class="level-playlist-link" href="${escapeAttribute(level.playlistUrl)}" target="_blank" rel="noopener noreferrer" aria-label="شاهد دروس مستوى ${levelKey} على YouTube"><span class="level-playlist-link__icon" aria-hidden="true"><svg viewBox="0 0 24 17" focusable="false"><path fill="#36598e" d="M23.5 2.66A3 3 0 0 0 21.39.54C19.53 0 12 0 12 0S4.47 0 2.61.5A3.08 3.08 0 0 0 .5 2.66 31.4 31.4 0 0 0 0 8.5a31.4 31.4 0 0 0 .5 5.84 3 3 0 0 0 2.11 2.12C4.47 17 12 17 12 17s7.53 0 9.39-.5a3 3 0 0 0 2.11-2.12A31.4 31.4 0 0 0 24 8.5a31.4 31.4 0 0 0-.5-5.84Z"/><path fill="#fff" d="m9.6 12.14 6.27-3.64L9.6 4.86v7.28Z"/></svg></span> دروس ${levelKey}</a>
    </div>`;
  }).join("");
}

function renderLevelSummary() {
  const level = COURSE_LEVELS[state.activeLevel];
  const stats = progressStore.getLevelStats(level);
  elements.activeLevelBadge.textContent = state.activeLevel;
  elements.levelTitle.textContent = level.title;
  elements.levelDescription.textContent = `${level.lessons.length} درسًا عمليًا بترتيب واضح؛ يُحسب التقدم من مهام كل درس.`;
  elements.levelPercent.textContent = `${stats.percent}%`;
  elements.completedLessons.textContent = String(stats.completedLessons);
  elements.remainingLessons.textContent = String(stats.remainingLessons);
  elements.completedTasks.textContent = `${stats.completedTasks} / ${stats.totalTasks}`;
  elements.lessonsTitle.textContent = `دروس مستوى ${state.activeLevel}`;
  elements.levelProgressRing.style.setProperty("--level-progress", String(stats.percent));
  elements.levelProgressRing.setAttribute("aria-valuenow", String(stats.percent));
  elements.levelProgressRing.setAttribute("aria-label", `تقدم مستوى ${state.activeLevel}`);
}

function renderFilters() {
  const filters = currentFilters();
  const focuses = [...new Set(COURSE_LEVELS[state.activeLevel].lessons.map((lesson) => lesson.focus))];
  elements.searchInput.value = filters.search;
  elements.statusFilter.value = filters.status;
  elements.focusFilter.innerHTML = [
    '<option value="all">كل المحاور</option>',
    ...focuses.map((focus) => `<option value="${escapeAttribute(focus)}">${escapeHtml(focus)}</option>`),
  ].join("");
  elements.focusFilter.value = focuses.includes(filters.focus) ? filters.focus : "all";
  if (!focuses.includes(filters.focus)) filters.focus = "all";
  syncCustomSelect(elements.statusFilter);
  syncCustomSelect(elements.focusFilter);
}

function setupCustomSelect(select) {
  const root = select?.closest("[data-custom-select]");
  if (!(select instanceof HTMLSelectElement) || !root || root.dataset.ready === "true") return;

  const trigger = root.querySelector(".custom-select__trigger");
  const menu = root.querySelector(".custom-select__menu");
  if (!(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) return;

  root.dataset.ready = "true";
  trigger.addEventListener("click", () => {
    if (root.classList.contains("is-open")) {
      closeCustomSelect(root);
    } else {
      openCustomSelect(root, false);
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) {
      event.preventDefault();
      closeCustomSelect(root, true);
      return;
    }
    if (event.key === "Tab" && root.classList.contains("is-open")) {
      closeCustomSelect(root);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openCustomSelect(root, true, event.key === "ArrowUp");
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-custom-select-option]");
    if (!(option instanceof HTMLButtonElement)) return;
    select.value = option.dataset.value ?? "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    closeCustomSelect(root, true);
  });

  menu.addEventListener("keydown", (event) => {
    const options = [...menu.querySelectorAll("[data-custom-select-option]")];
    const currentIndex = options.indexOf(document.activeElement);
    let nextIndex = currentIndex;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
    else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      closeCustomSelect(root, true);
      return;
    } else if (event.key === "Tab") {
      closeCustomSelect(root);
      return;
    } else {
      return;
    }

    event.preventDefault();
    options[nextIndex]?.focus();
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) closeCustomSelect(root);
  });
}

function syncCustomSelect(select) {
  const root = select?.closest("[data-custom-select]");
  const triggerValue = root?.querySelector("[data-custom-select-value]");
  const menu = root?.querySelector(".custom-select__menu");
  if (!(select instanceof HTMLSelectElement) || !root || !triggerValue || !menu) return;

  const selected = select.selectedOptions[0] ?? select.options[0];
  triggerValue.textContent = selected?.textContent ?? "";
  menu.innerHTML = [...select.options].map((option) => {
    const isSelected = option.value === select.value;
    return `<button class="custom-select__option${isSelected ? " is-selected" : ""}" type="button" role="option" aria-selected="${isSelected}" data-custom-select-option data-value="${escapeAttribute(option.value)}">
      <span>${escapeHtml(option.textContent)}</span>
      <span class="custom-select__indicator" aria-hidden="true"></span>
    </button>`;
  }).join("");
}

function openCustomSelect(root, focusOption = false, focusLast = false) {
  document.querySelectorAll("[data-custom-select].is-open").forEach((item) => {
    if (item !== root) closeCustomSelect(item);
  });
  const trigger = root.querySelector(".custom-select__trigger");
  const menu = root.querySelector(".custom-select__menu");
  root.classList.add("is-open");
  trigger?.setAttribute("aria-expanded", "true");
  if (menu) menu.hidden = false;
  if (!focusOption) return;

  const options = [...root.querySelectorAll("[data-custom-select-option]")];
  const selected = root.querySelector('[data-custom-select-option][aria-selected="true"]');
  (focusLast ? options.at(-1) : selected ?? options[0])?.focus();
}

function closeCustomSelect(root, restoreFocus = false) {
  const trigger = root.querySelector(".custom-select__trigger");
  const menu = root.querySelector(".custom-select__menu");
  root.classList.remove("is-open");
  trigger?.setAttribute("aria-expanded", "false");
  if (menu) menu.hidden = true;
  if (restoreFocus) trigger?.focus();
}

function renderLessonList() {
  const level = COURSE_LEVELS[state.activeLevel];
  const filters = currentFilters();
  const search = normalizeForSearch(filters.search);
  const lessons = level.lessons.filter((lesson) => {
    const stats = progressStore.getLessonStats(lesson);
    const matchesStatus = filters.status === "all" || filters.status === stats.status;
    const matchesFocus = filters.focus === "all" || filters.focus === lesson.focus;
    const documentationSearch = state.documentationLevels
      .get(state.activeLevel)?.searchableByLessonId.get(String(lesson.id)) ?? "";
    const searchable = [normalizeForSearch([
      lesson.title,
      lesson.focus,
      lesson.what_you_learn,
      lesson.conversational_goal,
      ...lesson.tasks.map((task) => task.text),
    ].join(" ")), documentationSearch].join(" ");
    return matchesStatus && matchesFocus && searchable.includes(search);
  });

  elements.lessonGrid.innerHTML = lessons.map(createLessonCard).join("");
  elements.emptyState.hidden = lessons.length > 0;
  elements.resultsSummary.textContent = lessons.length === level.lessons.length
    ? `${level.lessons.length} درسًا مرتبًا`
    : `${lessons.length} من ${level.lessons.length} درسًا مطابقًا`;
}

function createLessonCard(lesson, index) {
  const stats = progressStore.getLessonStats(lesson);
  const labels = {
    "not-started": "لم يبدأ",
    "in-progress": "قيد التقدم",
    completed: "مكتمل",
  };
  return `<a class="lesson-card lesson-card--${stats.status}" href="${lessonHref(state.activeLevel, lesson.id)}" aria-label="فتح الدرس ${escapeAttribute(lesson.title)}">
    <div class="lesson-card__top"><span>الدرس ${escapeHtml(lesson.id)}</span><span class="status status--${stats.status}">${labels[stats.status]}</span></div>
    <div class="lesson-card__body">
      <p class="lesson-focus" dir="rtl">${escapeHtml(lesson.focus)}</p>
      <h3 class="lesson-card__title" dir="rtl">${formatMixedTitle(lesson.title)}</h3>
      <p class="lesson-summary" dir="rtl">${escapeHtml(lesson.what_you_learn)}</p>
    </div>
    <div class="lesson-card__progress">
      <div><span>${stats.completedTasks} / ${stats.totalTasks} مهام</span><strong>${stats.percent}%</strong></div>
      <div class="progress-track progress-track--small" role="progressbar" aria-label="تقدم الدرس ${escapeAttribute(lesson.id)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}"><span style="width:${stats.percent}%"></span></div>
    </div>
  </a>`;
}

function renderLessonDetail(levelKey, lessonId) {
  const level = COURSE_LEVELS[levelKey];
  const lesson = getLesson(levelKey, lessonId);
  if (!lesson) return;
  const position = getLessonPosition(levelKey, lesson.id);
  const previous = level.lessons[position - 1] ?? null;
  const next = level.lessons[position + 1] ?? null;
  const stats = progressStore.getLessonStats(lesson);
  const embedUrl = getYoutubeEmbedUrl(lesson.url);
  const statusLabel = stats.completed ? "مكتمل" : stats.status === "in-progress" ? "قيد التقدم" : "لم يبدأ";

  elements.error.hidden = true;
  elements.app.hidden = false;
  elements.dashboard.hidden = true;
  elements.lessonView.hidden = false;
  document.title = `${lesson.title} | ${levelKey}`;

  elements.lessonView.innerHTML = `
    <header class="lesson-header">
      <div>
        <div class="lesson-header__meta"><span class="level-badge">${levelKey}</span><span>الدرس ${escapeHtml(lesson.id)} من ${level.lessons.length}</span><span class="status status--${stats.status}" data-lesson-status>${statusLabel}</span></div>
        <h1 id="lessonDetailTitle" >${escapeHtml(lesson.title)}</h1>
        <p class="lesson-focus" >${escapeHtml(lesson.focus)}</p>
      </div>
      <a class="button button--secondary" href="${levelHref(levelKey)}">العودة إلى الدروس</a>
    </header>

    <div class="lesson-layout">
      <div class="lesson-main">
        <div class="lesson-mode-tabs" role="tablist" aria-label="طريقة تعلّم الدرس">
          <button id="videoTab" class="lesson-mode-tab" type="button" role="tab" aria-controls="lessonVideoPanel" data-lesson-mode="video">شاهد الفيديو</button>
          <button id="readingTab" class="lesson-mode-tab" type="button" role="tab" aria-controls="lessonReadingPanel" data-lesson-mode="reading">اقرأ الدرس</button>
        </div>

        <div id="lessonVideoPanel" class="lesson-mode-panel" role="tabpanel" aria-labelledby="videoTab" data-lesson-panel="video">
          <section class="video-card" aria-labelledby="videoTitle">
            <div class="card-heading"><div><h2 id="videoTitle">فيديو الدرس</h2></div><a href="${escapeAttribute(lesson.url)}" target="_blank" rel="noopener noreferrer">فتحه في YouTube</a></div>
            ${embedUrl
      ? `<div class="video-frame"><iframe src="${escapeAttribute(embedUrl)}" title="فيديو: ${escapeAttribute(lesson.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`
      : '<div class="video-fallback"><p>تعذّر تضمين هذا الفيديو.</p><a class="button button--secondary" href="' + escapeAttribute(lesson.url) + '" target="_blank" rel="noopener noreferrer">مشاهدة الفيديو</a></div>'}
          </section>

          <section class="learning-grid" aria-label="أهداف الدرس">
            <article><span class="info-icon" aria-hidden="true">01</span><h2>ما ستتعلّمه</h2><p>${escapeHtml(lesson.what_you_learn)}</p></article>
            <article><span class="info-icon" aria-hidden="true">02</span><h2>هدفك الحواري</h2><p>${escapeHtml(lesson.conversational_goal)}</p></article>
          </section>
        </div>

        <div id="lessonReadingPanel" class="lesson-mode-panel reading-panel" role="tabpanel" aria-labelledby="readingTab" data-lesson-panel="reading" hidden>
          <div class="reading-inline-loader" data-reading-content data-level="${levelKey}" data-lesson-id="${escapeAttribute(lesson.id)}" role="status">
            <span class="reading-inline-loader__ring" aria-hidden="true"></span>
            <span>جارٍ تجهيز الدرس المقروء...</span>
          </div>
        </div>
      </div>

      <aside class="practice-card" aria-labelledby="practiceTitle">
        <div class="practice-card__header">
          <div><h2 id="practiceTitle">مهام الدرس</h2></div>
          <strong data-lesson-percent>${stats.percent}%</strong>
        </div>
        <div class="progress-track" data-lesson-progress role="progressbar" aria-label="تقدم مهام الدرس" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}"><span style="width:${stats.percent}%"></span></div>
        <p class="practice-caption" data-practice-caption>أكملت ${stats.completedTasks} من ${stats.totalTasks}. يُحفظ كل اختيار تلقائيًا.</p>
        <div class="task-list">${lesson.tasks.length ? lesson.tasks.map((task) => createTaskItem(levelKey, lesson, task)).join("") : '<p class="inline-notice">لا توجد مهام محفوظة لهذا الدرس.</p>'}</div>
        <button class="button button--primary button--full" type="button" data-complete-lesson="${escapeAttribute(lesson.id)}" ${stats.completed || !lesson.tasks.length ? "disabled" : ""}>${stats.completed ? "تم إكمال الدرس ✓" : "تحديد كل المهام كمكتملة"}</button>
      </aside>
    </div>

    <nav class="lesson-navigation" aria-label="التنقل بين الدروس">
      ${previous ? `<a href="${lessonHref(levelKey, previous.id)}"><span>الدرس السابق</span><strong >${escapeHtml(previous.title)}</strong></a>` : '<span class="nav-placeholder">هذا أول درس في المستوى</span>'}
      ${next ? `<a href="${lessonHref(levelKey, next.id)}" data-next-lesson><span>الدرس التالي</span><strong >${escapeHtml(next.title)}</strong></a>` : '<span class="nav-placeholder">أكملت آخر درس في المستوى</span>'}
    </nav>`;

  activateLessonMode(state.lessonMode, { save: false, focus: false });
  renderGlobalProgress();
}

function preloadDocumentationForLevel(levelKey) {
  if (state.documentationLevels.has(levelKey)) return;
  ensureLevelDocumentation(levelKey).then(() => {
    const route = parseRoute(location.hash);
    if (route?.view === "dashboard" && route.level === levelKey) renderLessonList();
  }).catch((error) => console.warn(`Documentation preload failed for ${levelKey}:`, error));
}

async function ensureLevelDocumentation(levelKey) {
  if (state.documentationLevels.has(levelKey)) return state.documentationLevels.get(levelKey);
  const documentation = await loadLevelDocumentation(levelKey);
  state.documentationLevels.set(levelKey, documentation);
  return documentation;
}

function activateLessonMode(requestedMode, { save = false, focus = false } = {}) {
  const mode = requestedMode === "reading" ? "reading" : "video";
  state.lessonMode = mode;
  elements.lessonView?.querySelectorAll("[data-lesson-mode]").forEach((button) => {
    const selected = button.dataset.lessonMode === mode;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.classList.toggle("is-active", selected);
    if (selected && focus) button.focus();
  });
  elements.lessonView?.querySelectorAll("[data-lesson-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.lessonPanel !== mode;
  });
  if (save) saveLessonViewPreference(mode);
  if (mode === "reading") loadCurrentReadingPanel();
}

function handleLessonTabKeydown(event) {
  const tab = event.target.closest("[data-lesson-mode]");
  if (!(tab instanceof HTMLButtonElement)) return;
  const tabs = [...elements.lessonView.querySelectorAll("[data-lesson-mode]")];
  const currentIndex = tabs.indexOf(tab);
  let nextIndex = null;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex == null) return;
  event.preventDefault();
  activateLessonMode(tabs[nextIndex].dataset.lessonMode, { save: true, focus: true });
}

async function loadCurrentReadingPanel() {
  const container = elements.lessonView?.querySelector("[data-reading-content]");
  if (!(container instanceof HTMLElement) || container.dataset.loaded === "true") return;
  const { level, lessonId } = container.dataset;
  try {
    const documentation = await ensureLevelDocumentation(level);
    const entry = documentation.byLessonId.get(String(lessonId));
    const lesson = getLesson(level, lessonId);
    if (!entry || !lesson) throw new Error("Documentation entry not found");
    if (!container.isConnected || container.dataset.level !== level || container.dataset.lessonId !== lessonId) return;
    container.dataset.loaded = "true";
    container.removeAttribute("role");
    container.className = "reading-article";
    container.innerHTML = createReadingArticle(entry, lesson);
  } catch (error) {
    console.error("Documentation loading failed:", error);
    if (!container.isConnected) return;
    container.className = "reading-load-error";
    container.innerHTML = `<p>تعذّر تحميل النسخة المقروءة لهذا الدرس.</p><button class="button button--secondary" type="button" data-return-video>العودة إلى الفيديو</button>`;
  }
}

function createReadingArticle(entry, lesson) {
  const sourceLabels = {
    manual_captions: "ترجمة يدوية",
    automatic_captions_verified: "ترجمة تلقائية متحقّق منها",
    audio_transcription: "تفريغ صوتي",
    audiovisual_verified: "مراجعة صوتية وبصرية",
    unavailable: "المصدر غير متاح",
    captions: "مبني على ترجمة الفيديو",
    metadata: "شرح مبني على موضوع الدرس",
    needs_review: "يحتاج إلى مراجعة إضافية",
  };
  const reviewLabels = {
    source_verified: "تم التحقق من المصدر",
    source_partial: "تغطية جزئية",
    needs_source: "بحاجة إلى مصدر",
    needs_human_review: "بحاجة إلى مراجعة بشرية",
    verified: "تمت المراجعة",
    generated_from_metadata: "مبني على بيانات الدرس",
    needs_review: "بحاجة إلى مراجعة",
  };
  const unavailable = entry.source_type === "unavailable" || entry.review_status === "needs_source";
  const outline = Array.isArray(entry.video_outline) ? entry.video_outline : [];
  const chronologicalSections = Array.isArray(entry.chronological_sections) ? entry.chronological_sections : [];
  const explanations = Array.isArray(entry.explanation) ? entry.explanation : [];
  const standaloneExplanations = chronologicalSections.length ? [] : explanations;
  const rules = Array.isArray(entry.rules_from_video) ? entry.rules_from_video : entry.grammar_rules ?? [];
  const examples = Array.isArray(entry.examples_from_video) ? entry.examples_from_video : entry.examples ?? [];
  const vocabulary = Array.isArray(entry.vocabulary_from_video) ? entry.vocabulary_from_video : entry.vocabulary ?? [];
  const teacherNotes = Array.isArray(entry.teacher_notes) ? entry.teacher_notes : [];
  const exercises = Array.isArray(entry.exercises_demonstrated) ? entry.exercises_demonstrated : [];
  const sourceLanguage = entry.source_language ?? entry.caption_language;
  const coverage = Number.isFinite(entry.combined_semantic_coverage)
    ? `${entry.combined_semantic_coverage}% دلاليًا`
    : Number.isFinite(entry.source_coverage_percent) ? `${entry.source_coverage_percent}%` : null;
  const audioCoverage = Number.isFinite(entry.audio_coverage) ? `${entry.audio_coverage}%` : null;
  const visualCoverage = Number.isFinite(entry.visual_timeline_coverage) ? `${entry.visual_timeline_coverage}%` : null;
  const tocSections = [
    ["reading-summary", "ملخص الدرس", true],
    ["reading-outline", "مسار الفيديو", outline.length > 0],
    ["reading-chronology", "الشرح الزمني الكامل", chronologicalSections.length > 0],
    ["reading-objectives", "أهداف التعلّم", (entry.learning_objectives ?? []).length > 0],
    ["reading-explanation", "الشرح", standaloneExplanations.length > 0],
    ["reading-rules", "القواعد", rules.length > 0],
    ["reading-examples", "أمثلة", examples.length > 0],
    ["reading-vocabulary", "المفردات", vocabulary.length > 0],
    ["reading-teacher-notes", "ملاحظات المعلّم", teacherNotes.length > 0],
    ["reading-exercises", "تطبيقات الفيديو", exercises.length > 0],
    ["reading-mistakes", "أخطاء شائعة", (entry.common_mistakes ?? []).length > 0],
    ["reading-recap", "خلاصة سريعة", (entry.quick_recap ?? []).length > 0],
    ["reading-tasks", "الاستعداد للمهام", (entry.task_preparation ?? []).length > 0],
  ].filter(([, , visible]) => visible);
  const toc = tocSections.length >= 6 ? `<nav class="reading-toc" aria-label="محتويات الدرس"><strong>في هذا الدرس</strong><ul>${tocSections.map(([id, label]) => `<li><a href="#${id}" data-reading-anchor="${id}">${label}</a></li>`).join("")}</ul></nav>` : "";
  const sourcePanel = `<aside class="reading-source" aria-label="مصدر محتوى الدرس">
    <strong>مبني على محتوى الفيديو</strong>
    <dl>
      <div><dt>المصدر</dt><dd>${escapeHtml(sourceLabels[entry.source_type] ?? entry.source_type)}</dd></div>
      ${sourceLanguage ? `<div><dt>اللغة</dt><dd>${escapeHtml(sourceLanguage === "ar" || sourceLanguage === "ar+de" ? "العربية مع أمثلة ألمانية" : sourceLanguage === "de" ? "الألمانية" : sourceLanguage)}</dd></div>` : ""}
      ${coverage ? `<div><dt>التغطية</dt><dd>${escapeHtml(coverage)}</dd></div>` : ""}
      ${audioCoverage ? `<div><dt>الصوت</dt><dd>${escapeHtml(audioCoverage)}</dd></div>` : ""}
      ${visualCoverage ? `<div><dt>الخط الزمني المرئي</dt><dd>${escapeHtml(visualCoverage)}</dd></div>` : ""}
      <div><dt>الحالة</dt><dd>${escapeHtml(reviewLabels[entry.review_status] ?? entry.review_status)}</dd></div>
    </dl>
  </aside>`;

  if (unavailable) {
    return `<article aria-labelledby="readingTitle">
      <header class="reading-header"><div><h2 id="readingTitle">${formatMixedTitle(lesson.title)}</h2></div></header>
      ${sourcePanel}
      <div class="reading-unavailable"><p>لم نتمكن بعد من استخراج محتوى هذا الفيديو بدقة. شاهد الفيديو للحصول على الشرح الكامل.</p><button class="button button--secondary" type="button" data-return-video>العودة إلى الفيديو</button></div>
    </article>`;
  }

  return `<article aria-labelledby="readingTitle">
    <header class="reading-header">
      <div>
        <h2 id="readingTitle">${formatMixedTitle(lesson.title)}</h2>
      </div>
      <div class="reading-meta"><span>${escapeHtml(entry.reading_time_minutes)} دقائق قراءة</span><span class="source-badge source-badge--${escapeAttribute(entry.source_type)}">${escapeHtml(sourceLabels[entry.source_type] ?? entry.source_type)}</span></div>
    </header>
    ${sourcePanel}
    ${toc}
    <div class="reading-prose">
      <section id="reading-summary" class="reading-section"><h3>ملخص الدرس</h3><p>${escapeHtml(entry.summary)}</p></section>
      ${createOutlineSection(outline, lesson)}
      ${createChronologicalSections(chronologicalSections, lesson)}
      ${createListSection("reading-objectives", "أهداف التعلّم", entry.learning_objectives ?? [])}
      ${standaloneExplanations.map((section, index) => `<section id="${index === 0 ? "reading-explanation" : `reading-explanation-${index + 1}`}" class="reading-section"><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.content)}</p>${createSourceRangeLink(section, lesson)}</section>`).join("")}
      ${createRulesSection(rules, lesson)}
      ${createExamplesSection(examples, lesson)}
      ${createTablesSection(entry.tables ?? [])}
      ${createVocabularySection(vocabulary, lesson)}
      ${createListSection("reading-teacher-notes", "ملاحظات المعلّم", teacherNotes, lesson)}
      ${createListSection("reading-exercises", "تطبيقات عرضها الفيديو", exercises, lesson)}
      ${createMistakesSection(entry.common_mistakes ?? [])}
      ${createListSection("reading-recap", "خلاصة سريعة", entry.quick_recap ?? [])}
      ${createTaskPreparationSection(entry.task_preparation ?? [], lesson)}
      <div class="reading-return"><button class="button button--secondary" type="button" data-return-video>العودة إلى الفيديو</button></div>
    </div>
  </article>`;
}

function createListSection(id, title, items, lesson = null) {
  if (!items.length) return "";
  return `<section id="${id}" class="reading-section"><h3>${title}</h3><ul>${items.map((item) => {
    const text = typeof item === "string" ? item : item.text ?? item.summary ?? item.question ?? "";
    return `<li>${escapeHtml(text)}${lesson ? createTimestampLink(item.timestamp, lesson) : ""}</li>`;
  }).join("")}</ul></section>`;
}

function createOutlineSection(outline, lesson) {
  if (!outline.length) return "";
  return `<section id="reading-outline" class="reading-section"><h3>مسار الفيديو</h3><ol class="video-outline">${outline.map((item) => `<li><div><strong>${escapeHtml(item.heading)}</strong><p>${escapeHtml(item.summary)}</p></div>${createTimestampLink(item.timestamp, lesson, item.timestamp)}</li>`).join("")}</ol></section>`;
}

function createChronologicalSections(sections, lesson) {
  if (!sections.length) return "";
  return `<section id="reading-chronology" class="reading-section reading-chronology"><h3>الشرح الزمني الكامل</h3><div class="chronology-stack">${sections.map((section) => {
    const paragraphs = (section.paragraphs ?? []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
    const concepts = section.concepts?.length ? `<div class="source-concepts"><strong>المفاهيم:</strong> ${section.concepts.map((concept) => `<span>${escapeHtml(concept)}</span>`).join("")}</div>` : "";
    const warnings = section.warnings?.length ? `<div class="source-callout"><strong>تنبيه المعلّمة</strong><ul>${section.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></div>` : "";
    const uncertainties = section.needs_human_review?.length ? `<div class="source-callout source-callout--review"><strong>needs_human_review</strong><ul>${section.needs_human_review.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : "";
    const table = section.table ? createSourceTable(section.table) : "";
    const examples = section.examples?.length ? `<div class="source-section-examples"><h5>أمثلة هذا المقطع</h5>${section.examples.map((example) => `<article class="language-example"><p lang="de" dir="ltr">${escapeHtml(example.de)}</p><p>${escapeHtml(example.ar)}</p>${example.note ? `<small>${escapeHtml(example.note)}</small>` : ""}${example.verified === false ? '<small class="source-uncertain">needs_human_review — الصياغة الألمانية غير مؤكدة نصيًا بالكامل</small>' : ""}${createTimestampLink(example.timestamp, lesson)}</article>`).join("")}</div>` : "";
    const exercise = section.exercise ? createSourceExercise(section.exercise) : "";
    return `<article class="chronology-section"><header><h4>${escapeHtml(section.heading)}</h4>${createSourceRangeLink(section, lesson)}</header>${paragraphs}${table}${examples}${exercise}${warnings}${uncertainties}${concepts}</article>`;
  }).join("")}</div></section>`;
}

function createSourceTable(table) {
  return `<div class="reading-table-wrap source-table"><table><thead><tr>${table.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td><bdi>${escapeHtml(cell)}</bdi></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function createSourceExercise(exercise) {
  const questions = exercise.questions?.length ? `<ol>${exercise.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>` : "";
  const answers = exercise.editorial_answers?.length ? `<div class="editorial-answers"><strong>إجابات إرشادية من التطبيق — لم يقدّمها الفيديو</strong><ul>${exercise.editorial_answers.map((answer) => `<li lang="de" dir="ltr">${escapeHtml(answer.de)}</li>`).join("")}</ul></div>` : "";
  return `<div class="source-exercise"><h5>تطبيق الفيديو</h5>${questions}${exercise.teacher_answers_provided ? "" : "<p>تطلب المعلّمة الحل، ولا تعرض الإجابات داخل الفيديو.</p>"}${answers}</div>`;
}

function createRulesSection(rules, lesson) {
  if (!rules.length) return "";
  return `<section id="reading-rules" class="reading-section"><h3>القواعد والأنماط</h3><div class="reading-stack">${rules.map((rule) => `<article class="reading-rule"><h4>${escapeHtml(rule.rule)}</h4><p>${escapeHtml(rule.explanation)}</p>${rule.pattern ? `<p class="language-pattern" lang="de" dir="ltr">${escapeHtml(rule.pattern)}</p>` : ""}${createTimestampLink(rule.timestamp, lesson)}</article>`).join("")}</div></section>`;
}

function createExamplesSection(examples, lesson) {
  if (!examples.length) return "";
  return `<section id="reading-examples" class="reading-section"><h3>أمثلة من الفيديو</h3><div class="example-list">${examples.map((example) => `<article class="language-example"><p lang="de" dir="ltr">${escapeHtml(example.de)}</p><p>${escapeHtml(example.ar)}</p>${example.note ? `<small>${escapeHtml(example.note)}</small>` : ""}${example.verified === false ? '<small class="source-uncertain">تفريغ غير مؤكّد بالكامل</small>' : ""}${createTimestampLink(example.timestamp, lesson)}</article>`).join("")}</div></section>`;
}

function createTablesSection(tables) {
  if (!tables.length) return "";
  return tables.map((table, index) => `<section class="reading-section" id="reading-table-${index + 1}"><h3>${escapeHtml(table.title)}</h3><div class="reading-table-wrap"><table><thead><tr>${table.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td><bdi>${escapeHtml(cell)}</bdi></td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`).join("");
}

function createVocabularySection(words, lesson) {
  if (!words.length) return "";
  return `<section id="reading-vocabulary" class="reading-section"><h3>مفردات من الفيديو</h3><dl class="vocabulary-list">${words.map((word) => `<div><dt lang="de" dir="ltr">${escapeHtml(word.de)}</dt><dd>${escapeHtml(word.ar)}${word.article ? `<small>${escapeHtml(word.article)}</small>` : ""}${word.plural ? `<small>الجمع: ${escapeHtml(word.plural)}</small>` : ""}${word.note ? `<small>${escapeHtml(word.note)}</small>` : ""}${createTimestampLink(word.timestamp, lesson)}</dd></div>`).join("")}</dl></section>`;
}

function createSourceRangeLink(section, lesson) {
  if (!section?.source_start) return "";
  const label = section.source_end ? `${section.source_start}–${section.source_end}` : section.source_start;
  return createTimestampLink(section.source_start, lesson, label);
}

function createTimestampLink(timestamp, lesson, label = null) {
  const seconds = timestampToSeconds(timestamp);
  if (!Number.isFinite(seconds) || !lesson?.url) return "";
  const separator = lesson.url.includes("?") ? "&" : "?";
  return ` <a class="timestamp-link" href="${escapeAttribute(`${lesson.url}${separator}t=${Math.floor(seconds)}s`)}" target="_blank" rel="noopener noreferrer" data-video-time="${seconds}">شاهد من ${escapeHtml(label ?? timestamp)}</a>`;
}

function timestampToSeconds(timestamp) {
  if (Number.isFinite(timestamp)) return Number(timestamp);
  if (typeof timestamp !== "string" || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(timestamp)) return Number.NaN;
  return timestamp.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

function createMistakesSection(mistakes) {
  if (!mistakes.length) return "";
  return `<section id="reading-mistakes" class="reading-section"><h3>أخطاء شائعة</h3><div class="mistake-list">${mistakes.map((mistake) => `<article><p class="mistake-wrong" lang="de" dir="ltr"><span aria-hidden="true">×</span> ${escapeHtml(mistake.wrong)}</p><p class="mistake-correct" lang="de" dir="ltr"><span aria-hidden="true">✓</span> ${escapeHtml(mistake.correct)}</p><p>${escapeHtml(mistake.explanation)}</p></article>`).join("")}</div></section>`;
}

function createTaskPreparationSection(items, lesson) {
  if (!items.length) return "";
  return `<section id="reading-tasks" class="reading-section"><h3>استعد لمهام الدرس</h3><ol class="task-preparation">${items.map((item) => {
    const task = lesson.tasks[item.task_index];
    return `<li><strong>${task ? escapeHtml(task.text) : `المهمة ${item.task_index + 1}`}</strong><p>${escapeHtml(item.guidance)}</p>${item.video_required ? '<span class="video-required">يتطلب الفيديو للاستماع أو التحقق من أمثلة المعلّم</span>' : ""}</li>`;
  }).join("")}</ol></section>`;
}

function getLessonViewPreference() {
  try {
    return localStorage.getItem(LESSON_VIEW_KEY) === "reading" ? "reading" : "video";
  } catch {
    return "video";
  }
}

function saveLessonViewPreference(mode) {
  try {
    localStorage.setItem(LESSON_VIEW_KEY, mode === "reading" ? "reading" : "video");
  } catch {
    // The selected view still works for this session when storage is unavailable.
  }
}

function refreshLessonProgress(levelKey, lessonId, { scrollToNavigation = false } = {}) {
  const lesson = getLesson(levelKey, lessonId);
  if (!lesson) return;

  const stats = progressStore.getLessonStats(lesson);
  const statusLabel = stats.completed ? "مكتمل" : stats.status === "in-progress" ? "قيد التقدم" : "لم يبدأ";
  const status = elements.lessonView.querySelector("[data-lesson-status]");
  if (status) {
    status.className = `status status--${stats.status}`;
    status.textContent = statusLabel;
  }

  const percent = elements.lessonView.querySelector("[data-lesson-percent]");
  if (percent) percent.textContent = `${stats.percent}%`;
  const progressBar = elements.lessonView.querySelector("[data-lesson-progress]");
  setProgress(progressBar, progressBar?.querySelector("span"), stats.percent);

  const caption = elements.lessonView.querySelector("[data-practice-caption]");
  if (caption) caption.textContent = `أكملت ${stats.completedTasks} من ${stats.totalTasks}. يُحفظ كل اختيار تلقائيًا.`;

  lesson.tasks.forEach((task) => {
    const checkbox = elements.lessonView.querySelector(`[data-task-id="${escapeSelector(task.id)}"]`);
    if (!(checkbox instanceof HTMLInputElement)) return;
    checkbox.checked = progressStore.isTaskComplete(task.id);
    checkbox.closest(".task-item")?.classList.toggle("is-complete", checkbox.checked);
  });

  const completionButton = elements.lessonView.querySelector("[data-complete-lesson]");
  if (completionButton instanceof HTMLButtonElement) {
    completionButton.disabled = stats.completed || !lesson.tasks.length;
    completionButton.textContent = stats.completed ? "تم إكمال الدرس ✓" : "تحديد كل المهام كمكتملة";
  }
  renderGlobalProgress();

  if (scrollToNavigation && stats.completed) {
    const target = elements.lessonView.querySelector("[data-next-lesson]")
      ?? elements.lessonView.querySelector(".lesson-navigation");
    window.requestAnimationFrame(() => {
      target?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
      if (target instanceof HTMLElement) {
        target.classList.remove("is-completion-highlight");
        void target.offsetWidth;
        target.classList.add("is-completion-highlight");
        window.setTimeout(() => target.classList.remove("is-completion-highlight"), 3000);
      }
    });
  }
}

function createTaskItem(levelKey, lesson, task) {
  const checked = progressStore.isTaskComplete(task.id);
  const inputId = `task-${levelKey}-${lesson.id}-${task.index}`;
  return `<label class="task-item${checked ? " is-complete" : ""}" for="${escapeAttribute(inputId)}">
    <input id="${escapeAttribute(inputId)}" type="checkbox" data-task-id="${escapeAttribute(task.id)}" data-lesson-id="${escapeAttribute(lesson.id)}" ${checked ? "checked" : ""}>
    <span class="task-check" aria-hidden="true"></span>
    <span >${escapeHtml(task.text)}</span>
  </label>`;
}

function openContinueLesson() {
  const orderedLevels = [state.activeLevel, ...LEVEL_KEYS.filter((level) => level !== state.activeLevel)];
  let target = null;
  for (const levelKey of orderedLevels) {
    const lesson = COURSE_LEVELS[levelKey].lessons.find((item) => !progressStore.getLessonStats(item).completed);
    if (lesson) {
      target = { levelKey, lesson };
      break;
    }
  }
  if (!target) target = { levelKey: state.activeLevel, lesson: COURSE_LEVELS[state.activeLevel].lessons[0] };
  if (target.lesson) location.hash = lessonHref(target.levelKey, target.lesson.id).slice(1);
}

function resetFilters() {
  state.filters[state.activeLevel] = { search: "", status: "all", focus: "all" };
  renderFilters();
  renderLessonList();
  elements.searchInput.focus();
}

function currentFilters() {
  return state.filters[state.activeLevel];
}

function setProgress(bar, fill, percent) {
  bar?.setAttribute("aria-valuenow", String(percent));
  if (fill) fill.style.width = `${percent}%`;
}

function levelHref(level) {
  return `#/level/${encodeURIComponent(level)}`;
}

function lessonHref(level, lessonId) {
  return `${levelHref(level)}/lesson/${encodeURIComponent(lessonId)}`;
}

function normalizeForSearch(value) {
  return String(value ?? "").normalize("NFC").toLocaleLowerCase();
}

function showFatalError(message, hideApp = true) {
  elements.loading.hidden = true;
  elements.error.hidden = false;
  elements.errorMessage.textContent = message;
  if (hideApp) elements.app.hidden = true;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMixedTitle(value) {
  return String(value ?? "")
    .split(/([A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9\s.,:;!?()+\-–—/|&]*)/g)
    .map((part) => /[A-Za-zÀ-ž0-9]/.test(part) && !/[\u0600-\u06ff]/.test(part)
      ? `<bdi class="ltr-fragment" dir="ltr">${escapeHtml(part)}</bdi>`
      : escapeHtml(part))
    .join("");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeSelector(value) {
  return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/(["\\])/g, "\\$1");
}
