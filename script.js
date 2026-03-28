const learningPlan = [
  {
    day: 1,
    videoTime: "00:00 - 00:30",
    focus: "جمل المصدر Infinitiv + zu",
    task: "اكتب 5 جمل عما تخطط أو تنسى فعله في عملك كمطور باستخدام zu.",
  },
  {
    day: 2,
    videoTime: "00:30 - 01:00",
    focus: "الـ Modalverben بدون zu",
    task: "قم بتحويل 5 جمل من يومك الأول إلى صيغة الاستطاعة أو الوجوب بدون zu.",
  },
  {
    day: 3,
    videoTime: "01:00 - 01:30",
    focus: "الروابط dass, weil, wenn",
    task: "كون جملتين لكل رابط تصف فيهما: لماذا تتعلم الألمانية؟ ومتى تنهي عملك؟",
  },
  {
    day: 4,
    videoTime: "01:30 - 02:00",
    focus: "حالات الـ Dativ & Akkusativ",
    task: "اختر 5 أفعال من الفيديو وضعها في جمل مع تحديد المفعول به الصحيح (جر أو نصب).",
  },
  {
    day: 5,
    videoTime: "02:00 - 02:30",
    focus: "أفعال الحركة والسكون",
    task: "صف مكان أشياء مكتبك (الحاسوب، الكرسي، المكتب) باستخدام حروف الجر المتغيرة.",
  },
  {
    day: 6,
    videoTime: "02:30 - 03:00",
    focus: "الماضي البسيط Präteritum",
    task: "اكتب فقرة من 5 جمل تحكي فيها ماذا فعلت في مشروعك البرمجي السابق.",
  },
  {
    day: 7,
    videoTime: "03:00 - 03:30",
    focus: "الماضي التام Perfekt",
    task: "مارس الـ Shadowing مع جمل الماضي التي تذكرها ميرا لضبط تصريف الفعل المساعد.",
  },
  {
    day: 8,
    videoTime: "03:30 - 04:00",
    focus: "جمل الوصل Relativsätze",
    task: "حاول وصف زميلك في العمل أو لغة برمجة تحبها باستخدام جملة وصل (die, der, das).",
  },
  {
    day: 9,
    videoTime: "04:00 - 04:30",
    focus: "المبني للمجهول Passiv",
    task: "حول جمل معلومة (مثل: أنا أكتب الكود) إلى مبني للمجهول (الكود يُكتب) كما في الشرح.",
  },
  {
    day: 10,
    videoTime: "04:30 - 05:00",
    focus: "التمني والنصيحة Konjunktiv II",
    task: "اكتب 3 جمل تبدأ بـ لو كنت مكانك.. أو أتمنى لو.. تخص تعلم اللغة أو العمل.",
  },
  {
    day: 11,
    videoTime: "05:00 - 05:30",
    focus: "مقارنة وتصريف الصفات",
    task: "قارن بين لغتي برمجة أو تطبيقين من حيث السهولة والسرعة مستخدماً صيغة المقارنة.",
  },
  {
    day: 12,
    videoTime: "05:30 - 06:00",
    focus: "حروف الجر الزمانية والمكانية",
    task: "ارسم جدولاً زمنياً ليومك مستخدماً حروف الجر الزمانية (um, vor, nach, seit).",
  },
  {
    day: 13,
    videoTime: "06:00 - النهاية",
    focus: "الروابط obwohl, trotzdem",
    task: "تحدَّ نفسك بكتابة جملة واحدة طويلة تجمع فيها بين رغم من و النتيجة لملخص الكورس.",
  },
];

const storageKey = "daily-german-learning-progress";
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
  bindEvents();
  render();
}

function loadCompletedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
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
    if (!day) {
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
  const uniqueTopics = new Set(learningPlan.map((item) => item.focus)).size;

  elements.totalDays.textContent = String(totalDays);
  elements.totalDuration.textContent = formatMinutes(totalMinutes);
  elements.mainTopics.textContent = `${uniqueTopics} محوراً`;
}

function calculateTotalMinutes(items) {
  return items.reduce((total, item) => {
    const [start, end] = item.videoTime.split(" - ");
    if (!start || !end || end === "النهاية") {
      return total;
    }

    return total + Math.max(0, toMinutes(end) - toMinutes(start));
  }, 0);
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
    const matchesSearch = `${item.focus} ${item.task}`.toLowerCase().includes(state.search);
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
        <h3 class="task-title">${item.focus}</h3>
      </div>

      <div class="task-block">
        <span class="task-label">التركيز الأساسي</span>
        <p class="task-text">${item.focus}</p>
      </div>

      <div class="task-block">
        <span class="task-label">المهمة التطبيقية</span>
        <p class="task-text">${item.task}</p>
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
