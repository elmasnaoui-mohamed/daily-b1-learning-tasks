const learningPlan = [
  {
    day: 1,
    videoTime: "00:00 - 00:26",
    module: "الجمل المصدرية (Infinitiv + zu)",
    task: "اكتب 5 جمل عما تخطط أو تأمل فعله في عطلة نهاية الأسبوع باستخدام zu.",
    duration: "~26 د",
  },
  {
    day: 2,
    videoTime: "00:26 - 01:03",
    module: "الأفعال المساعدة بدون zu",
    task: "اكتب 5 جمل عما يجب أو يمكن للشخص فعله ليعيش حياة صحية.",
    duration: "~37 د",
  },
  {
    day: 3,
    videoTime: "01:03 - 01:41",
    module: "الروابط الأساسية (dass, weil, wenn)",
    task: "عبّر عن رأيك في موضوع عام (مثلاً: لماذا السفر مهم؟) باستخدام هذه الروابط.",
    duration: "~38 د",
  },
  {
    day: 4,
    videoTime: "01:41 - 02:18",
    module: "حالات الـ Dativ & Akkusativ",
    task: "اختر 5 أفعال من الفيديو وضعها في جمل تصف مواقف يومية في السوق أو المنزل.",
    duration: "~37 د",
  },
  {
    day: 5,
    videoTime: "02:18 - 02:45",
    module: "أفعال الحركة والسكون (Wechselpräp)",
    task: "صف محتويات غرفتك أو صالة الجلوس باستخدام حروف الجر المتغيرة بدقة.",
    duration: "~27 د",
  },
  {
    day: 6,
    videoTime: "02:45 - 03:22",
    module: "زمن الماضي (Präteritum & Perfekt)",
    task: "اكتب فقرة قصيرة تحكي فيها قصة بسيطة عن رحلة قمت بها في الماضي.",
    duration: "~37 د",
  },
  {
    day: 7,
    videoTime: "03:22 - 03:52",
    module: "جمل الوصل (Relativsätze)",
    task: "حاول وصف صديقك المفضل أو مدينتك باستخدام جملة وصل (der, die, das).",
    duration: "~30 د",
  },
  {
    day: 8,
    videoTime: "03:52 - 04:33",
    module: "المبني للمجهول (Passiv)",
    task: "صف عملية يومية (مثل: كيف تُطبخ الأكلة المفضلة؟) باستخدام صيغة المبني للمجهول.",
    duration: "~41 د",
  },
  {
    day: 9,
    videoTime: "04:33 - 05:05",
    module: "التمني والنصيحة (Konjunktiv II)",
    task: "قدم 3 نصائح لصديق يريد تعلم الألمانية باستخدام لو كنت مكانك لفعلت..",
    duration: "~32 د",
  },
  {
    day: 10,
    videoTime: "05:05 - 05:40",
    module: "مقارنة وتصريف الصفات",
    task: "قارن بين وسيلتي مواصلات أو مدينتين من حيث السرعة والجمال والتكلفة.",
    duration: "~35 د",
  },
  {
    day: 11,
    videoTime: "05:40 - 06:12",
    module: "حروف الجر الزمانية والمكانية",
    task: "صف روتينك اليومي بدقة باستخدام حروف الجر (vor, nach, seit, um).",
    duration: "~32 د",
  },
  {
    day: 12,
    videoTime: "06:12 - النهاية",
    module: "الروابط المتقدمة (obwohl, trotzdem)",
    task: "اكتب ملخصاً عما تعلمته، موضحاً رغم صعوبة اللغة إلا أنك مستمر في التعلم.",
    duration: "~23 د",
  },
];

const storageKey = "daily-german-learning-progress";
const validDays = new Set(learningPlan.map((item) => item.day));
const state = {
  filter: "all",
  search: "",
  completed: loadCompletedState(),
};

const elements = {
  tasksContainer: document.querySelector("#tasksContainer"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  filterButtons: document.querySelectorAll(".filter-button"),
  progressFill: document.querySelector("#progressFill"),
  heroProgressText: document.querySelector("#heroProgressText"),
  heroProgressPercent: document.querySelector("#heroProgressPercent"),
  completedSummary: document.querySelector("#completedSummary"),
  resultsSummary: document.querySelector("#resultsSummary"),
  progressBar: document.querySelector(".progress-bar"),
  totalDays: document.querySelector("#totalDays"),
  totalDuration: document.querySelector("#totalDuration"),
  mainTopics: document.querySelector("#mainTopics"),
};

init();

function init() {
  updateOverview();
  updateActiveFilter();
  bindEvents();
  render();
}

function loadCompletedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const normalizedDays = Array.isArray(saved)
      ? saved.filter((day) => validDays.has(Number(day))).map(Number)
      : [];

    return new Set(normalizedDays);
  } catch {
    return new Set();
  }
}

function saveCompletedState() {
  localStorage.setItem(storageKey, JSON.stringify([...state.completed]));
}

function bindEvents() {
  elements.searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter || "all";
      updateActiveFilter();
      render();
    });
  });

  elements.tasksContainer?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
      return;
    }

    const day = Number(target.dataset.day);
    if (!validDays.has(day)) {
      return;
    }

    if (target.checked) {
      state.completed.add(day);
    } else {
      state.completed.delete(day);
    }

    saveCompletedState();
    render();
  });
}

function updateOverview() {
  const totalDays = learningPlan.length;
  const totalMinutes = calculateTotalMinutes(learningPlan);
  const uniqueModules = new Set(learningPlan.map((item) => item.module)).size;

  elements.totalDays.textContent = String(totalDays);
  elements.totalDuration.textContent = formatMinutes(totalMinutes);
  elements.mainTopics.textContent = `${uniqueModules} محوراً`;
}

function calculateTotalMinutes(items) {
  return items.reduce((total, item) => total + getItemDurationMinutes(item), 0);
}

function getItemDurationMinutes(item) {
  const durationMatch = item.duration?.match(/(\d+)/);
  if (durationMatch) {
    return Number(durationMatch[1]);
  }

  const [start, end] = item.videoTime.split(" - ");
  if (!start || !end || end === "النهاية") {
    return 0;
  }

  return Math.max(0, toMinutes(end) - toMinutes(start));
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours} ساعات و${minutes} دقيقة`;
  }

  if (hours) {
    return `${hours} ساعات`;
  }

  return `${minutes} دقيقة`;
}

function render() {
  const visibleTasks = getVisibleTasks();
  const completedCount = state.completed.size;
  const totalCount = learningPlan.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  elements.tasksContainer.innerHTML = visibleTasks.map(createTaskCardMarkup).join("");
  elements.emptyState.hidden = visibleTasks.length > 0;

  elements.progressFill.style.width = `${progressPercent}%`;
  elements.progressBar?.setAttribute("aria-valuenow", String(progressPercent));
  elements.heroProgressText.textContent = `أنجزت ${completedCount} من ${totalCount}`;
  elements.completedSummary.textContent = `أنجزت ${completedCount} من ${totalCount}`;
  elements.heroProgressPercent.textContent = `${progressPercent}%`;
  elements.resultsSummary.textContent = buildResultsSummary(visibleTasks.length);
}

function getVisibleTasks() {
  return learningPlan.filter((item) => {
    const haystack = `${item.module} ${item.task} ${item.videoTime} ${item.duration}`.toLowerCase();
    const matchesSearch = haystack.includes(state.search);
    const isCompleted = state.completed.has(item.day);

    if (state.filter === "completed") {
      return matchesSearch && isCompleted;
    }

    if (state.filter === "pending") {
      return matchesSearch && !isCompleted;
    }

    return matchesSearch;
  });
}

function buildResultsSummary(count) {
  if (count === learningPlan.length && !state.search && state.filter === "all") {
    return "جميع المهام ظاهرة الآن";
  }

  return `عدد النتائج الحالية: ${count}`;
}

function createTaskCardMarkup(item) {
  const completed = state.completed.has(item.day);

  return `
    <article class="task-card${completed ? " is-completed" : ""}">
      <div class="task-topline">
        <span class="task-day">اليوم ${item.day}</span>
        <span class="task-time">${item.videoTime}</span>
      </div>

      <div class="task-block">
        <h3 class="task-title">${item.module}</h3>
      </div>

      <div class="task-block">
        <span class="task-label">الموضوع المتكامل</span>
        <p class="task-text">${item.module}</p>
      </div>

      <div class="task-block">
        <span class="task-label">المهمة التطبيقية العامة</span>
        <p class="task-text">${item.task}</p>
      </div>

      <div class="task-block">
        <span class="task-label">المدة</span>
        <p class="task-text">${item.duration}</p>
      </div>

      <div class="task-footer">
        <label class="task-toggle">
          <input type="checkbox" data-day="${item.day}" ${completed ? "checked" : ""} />
          <span class="toggle-mark" aria-hidden="true"></span>
          <span>${completed ? "تم الإنجاز" : "تحديد كمكتمل"}</span>
        </label>
        <span class="status-pill">${completed ? "منجز" : "قيد التنفيذ"}</span>
      </div>
    </article>
  `;
}

function updateActiveFilter() {
  elements.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === state.filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

