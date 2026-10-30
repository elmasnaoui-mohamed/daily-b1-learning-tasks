const STORAGE_KEY = "deutschMira:telc:v1";

const AREA_META = {
  lesen: {
    label: "القراءة",
    de: "Leseverstehen",
    description: "نصوص، عناوين، اختيار من متعدد ومطابقة الإعلانات.",
    modules: ["lesenTeil1", "lesenTeil2", "lesenTeil3"],
    accent: "violet",
  },
  sprachbausteine: {
    label: "التراكيب اللغوية",
    de: "Sprachbausteine",
    description: "قواعد ومفردات داخل رسائل ونصوص امتحانية.",
    modules: ["sprachbausteineTeil1", "sprachbausteineTeil2"],
    accent: "magenta",
  },
  hoeren: {
    label: "الاستماع",
    de: "Hörverstehen",
    description: "تدريب على فهم المقابلات والإعلانات والمواقف المسموعة.",
    modules: ["hoerenTeil1", "hoerenTeil2", "hoerenTeil3"],
    accent: "cyan",
  },
  schreiben: {
    label: "الكتابة",
    de: "Schreiben",
    description: "مواضيع كتابة مع نقاط واضحة ومسودة محفوظة تلقائيًا.",
    modules: ["schreiben"],
    accent: "orange",
  },
  sprechen: {
    label: "المحادثة",
    de: "Sprechen",
    description: "موضوعات الرأي، العرض والتخطيط المشترك للامتحان الشفهي.",
    modules: ["sprechen"],
    accent: "green",
  },
};

const MODULE_LABELS = {
  lesenTeil1: "Lesen Teil 1 · Überschriften",
  lesenTeil2: "Lesen Teil 2 · Auswahl",
  lesenTeil3: "Lesen Teil 3 · Situationen",
  sprachbausteineTeil1: "Sprachbausteine Teil 1",
  sprachbausteineTeil2: "Sprachbausteine Teil 2",
  hoerenTeil1: "Hören Teil 1",
  hoerenTeil2: "Hören Teil 2",
  hoerenTeil3: "Hören Teil 3",
  schreiben: "Schreiben",
  sprechen: "Sprechen",
};

const dataCache = new Map();

export function createTelcApp({ root, headerRoot, entryLink, showToast = () => {} }) {
  const state = readState();
  let renderToken = 0;
  let activeRoute = null;
  const confirmationDialog = createConfirmationDialog();

  root.addEventListener("change", handleChange);
  root.addEventListener("input", handleInput);
  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", handleDocumentClick);

  async function render(route) {
    activeRoute = route;
    syncSimulationForRoute(route);
    renderHeader(route);
    const token = ++renderToken;
    root.innerHTML = loadingMarkup();

    if (!route.level) {
      const [b1, b2] = await Promise.all([loadLevel("B1"), loadLevel("B2")]);
      if (token !== renderToken) return;
      root.innerHTML = renderLevelSelector(b1, b2, state);
      document.title = "TELC Prüfungsstudio | Deutsch mit Mira";
      return;
    }

    const data = await loadLevel(route.level);
    if (token !== renderToken) return;

    if (!route.area) {
      root.innerHTML = renderDashboard(route.level, data, state);
      document.title = `TELC ${route.level} | Deutsch mit Mira`;
      return;
    }

    if (route.area === "results") {
      root.innerHTML = renderResults(route.level, data, state);
      document.title = `Ergebnisse · TELC ${route.level}`;
      return;
    }

    if (route.area === "simulation") {
      root.innerHTML = renderSimulation(route.level, data, state);
      document.title = `Prüfungssimulation · TELC ${route.level}`;
      updateSimulationTimers();
      return;
    }

    const area = AREA_META[route.area];
    if (!area) {
      location.hash = `#/telc/${route.level}`;
      return;
    }

    if (!route.module || route.exercise == null) {
      root.innerHTML = renderLibrary(route.level, route.area, data, state, route.module);
      document.title = `${area.de} · TELC ${route.level}`;
      return;
    }

    const items = data.modules[route.module];
    const index = Number.parseInt(route.exercise, 10);
    if (!area.modules.includes(route.module) || !items || !Number.isInteger(index) || !items[index]) {
      location.hash = `#/telc/${route.level}/${route.area}`;
      return;
    }

    root.innerHTML = renderExercise(route.level, route.area, route.module, index, items[index], items.length, state);
    document.title = `${exerciseTitle(items[index])} · TELC ${route.level}`;
  }

  function handleChange(event) {
    const answer = event.target.closest("[data-telc-answer]");
    if (!answer) return;
    const exercise = root.querySelector("[data-exercise-key]");
    if (!exercise) return;
    const key = exercise.dataset.exerciseKey;
    state.answers[key] ||= {};
    state.answers[key][answer.dataset.telcAnswer] = answer.value;
    delete state.results[key];
    saveState(state);
    updateSavedIndicator();
  }

  function handleInput(event) {
    const draft = event.target.closest("[data-telc-draft]");
    if (!draft) return;
    state.drafts[draft.dataset.telcDraft] = draft.value;
    saveState(state);
    updateSavedIndicator();
  }

  async function handleClick(event) {
    const selectTrigger = event.target.closest("[data-telc-select-trigger]");
    if (selectTrigger) {
      toggleCustomSelect(selectTrigger);
      return;
    }

    const selectOption = event.target.closest("[data-telc-select-option]");
    if (selectOption) {
      chooseCustomSelectOption(selectOption);
      return;
    }

    const simulationStart = event.target.closest("[data-simulation-start]");
    if (simulationStart) {
      startSimulation(simulationStart.dataset.simulationStart);
      return;
    }

    const simulationReset = event.target.closest("[data-simulation-reset]");
    if (simulationReset) {
      const confirmed = await askForConfirmation({
        title: "بدء محاكاة جديدة؟",
        message: "سيتم حذف جلسة المحاكاة الحالية ومؤقتها، بينما ستبقى نتائج تمارينك المحفوظة.",
        confirmLabel: "ابدأ جلسة جديدة",
      });
      if (!confirmed) return;
      delete state.simulations[simulationReset.dataset.simulationReset];
      saveState(state);
      rerenderCurrentRoute();
      return;
    }

    const simulationToggle = event.target.closest("[data-simulation-toggle]");
    if (simulationToggle) {
      const level = simulationToggle.dataset.simulationToggle;
      const session = state.simulations[level];
      if (!session || session.finishedAt) return;
      if (session.pausedAt) {
        resumeSimulation(level);
        showToast("تم استئناف مؤقت المحاكاة");
      } else {
        pauseSimulation(level);
        showToast("تم إيقاف مؤقت المحاكاة مؤقتًا");
      }
      rerenderCurrentRoute();
      return;
    }

    const submit = event.target.closest("[data-telc-submit]");
    if (submit) {
      submitExercise(submit.dataset.telcSubmit);
      return;
    }

    const complete = event.target.closest("[data-telc-complete]");
    if (complete) {
      state.completed[complete.dataset.telcComplete] = !state.completed[complete.dataset.telcComplete];
      if (state.completed[complete.dataset.telcComplete]) markSimulationStep(complete.dataset.telcComplete);
      saveState(state);
      showToast(state.completed[complete.dataset.telcComplete] ? "تم حفظ إنجاز التمرين" : "تم فتح التمرين من جديد");
      rerenderCurrentRoute();
      return;
    }

    const reset = event.target.closest("[data-telc-reset]");
    if (reset) {
      const key = reset.dataset.telcReset;
      const confirmed = await askForConfirmation({
        title: "إعادة ضبط التمرين؟",
        message: "سيتم حذف إجاباتك ونتيجتك المحفوظة لهذا التمرين فقط.",
        confirmLabel: "إعادة الضبط",
      });
      if (!confirmed) return;
      delete state.answers[key];
      delete state.results[key];
      delete state.drafts[key];
      delete state.completed[key];
      saveState(state);
      showToast("تمت إعادة ضبط التمرين");
      rerenderCurrentRoute();
    }
  }

  function handleDocumentClick(event) {
    if (!root.contains(event.target) || !event.target.closest("[data-telc-custom-select]")) closeCustomSelects();
  }

  function handleKeydown(event) {
    const trigger = event.target.closest("[data-telc-select-trigger]");
    if (trigger && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openCustomSelect(trigger, event.key === "ArrowUp" ? "last" : "selected");
      return;
    }

    const option = event.target.closest("[data-telc-select-option]");
    if (!option) return;
    const options = [...option.parentElement.querySelectorAll("[data-telc-select-option]")];
    const index = options.indexOf(option);
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      chooseCustomSelectOption(option);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      options[event.key === "Home" ? 0 : options.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      const select = option.closest("[data-telc-custom-select]");
      closeCustomSelects();
      select?.querySelector("[data-telc-select-trigger]")?.focus();
    }
  }

  function toggleCustomSelect(trigger) {
    const select = trigger.closest("[data-telc-custom-select]");
    const wasOpen = select?.classList.contains("is-open");
    closeCustomSelects();
    if (!wasOpen) openCustomSelect(trigger, "selected");
  }

  function openCustomSelect(trigger, focusTarget = null) {
    const select = trigger.closest("[data-telc-custom-select]");
    if (!select) return;
    closeCustomSelects();
    select.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    const menu = select.querySelector("[data-telc-select-menu]");
    menu.hidden = false;
    if (focusTarget) {
      const options = [...menu.querySelectorAll("[data-telc-select-option]")];
      const target = focusTarget === "last" ? options.at(-1) : menu.querySelector('[aria-selected="true"]') || options[0];
      target?.focus();
    }
  }

  function closeCustomSelects() {
    root.querySelectorAll("[data-telc-custom-select].is-open").forEach((select) => {
      select.classList.remove("is-open");
      select.querySelector("[data-telc-select-trigger]")?.setAttribute("aria-expanded", "false");
      const menu = select.querySelector("[data-telc-select-menu]");
      if (menu) menu.hidden = true;
    });
  }

  function chooseCustomSelectOption(option) {
    const select = option.closest("[data-telc-custom-select]");
    const exercise = root.querySelector("[data-exercise-key]");
    if (!select || !exercise) return;
    const key = exercise.dataset.exerciseKey;
    const question = select.dataset.question;
    const value = option.dataset.value;
    state.answers[key] ||= {};
    state.answers[key][question] = value;
    delete state.results[key];
    saveState(state);

    select.querySelectorAll("[data-telc-select-option]").forEach((item) => {
      const selected = item === option;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    const trigger = select.querySelector("[data-telc-select-trigger]");
    const label = trigger?.querySelector("[data-telc-select-label]");
    if (label) label.textContent = option.dataset.display;
    trigger?.classList.add("has-value");
    closeCustomSelects();
    trigger?.focus();
    updateSavedIndicator();
  }

  function askForConfirmation({ title, message, confirmLabel }) {
    return confirmationDialog.open({ title, message, confirmLabel });
  }

  function submitExercise(key) {
    const exercise = root.querySelector("[data-exercise-key]");
    if (!exercise) return;
    const expected = JSON.parse(exercise.dataset.expected || "null");
    if (!expected) {
      state.completed[key] = true;
      markSimulationStep(key);
      saveState(state);
      showToast("تم حفظ إنجاز التمرين");
      rerenderCurrentRoute();
      return;
    }

    const answers = state.answers[key] || {};
    const entries = Object.entries(expected);
    const answered = entries.filter(([question]) => answers[question] != null).length;
    if (answered < entries.length) {
      showToast(`أجب عن جميع الأسئلة أولًا (${answered}/${entries.length})`);
      return;
    }

    const score = entries.filter(([question, value]) => String(answers[question]) === String(value)).length;
    state.results[key] = {
      score,
      total: entries.length,
      percent: Math.round((score / entries.length) * 100),
      submittedAt: new Date().toISOString(),
    };
    state.completed[key] = true;
    markSimulationStep(key);
    saveState(state);
    showToast(`النتيجة ${score} من ${entries.length} — يمكنك المحاولة بلا حدود`);
    rerenderCurrentRoute();
  }

  function rerenderCurrentRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    render({ view: "telc", level: parts[1], area: parts[2], module: parts[3], exercise: parts[4] });
  }

  function updateSavedIndicator() {
    const indicator = root.querySelector("[data-saved-indicator]");
    if (!indicator) return;
    indicator.textContent = "تم الحفظ الآن";
    indicator.classList.add("is-saved");
    window.setTimeout(() => indicator.classList.remove("is-saved"), 900);
  }

  async function startSimulation(level) {
    const data = await loadLevel(level);
    const plan = Object.entries(data.modules).map(([module, items]) => {
      const index = Math.floor(Math.random() * items.length);
      const item = items[index];
      return {
        module,
        area: areaForModule(module),
        index,
        key: exerciseKey(level, module, item),
        title: exerciseTitle(item),
      };
    });
    state.simulations[level] = {
      startedAt: Date.now(),
      durationSeconds: level === "B1" ? 150 * 60 : 180 * 60,
      plan,
      completed: [],
    };
    saveState(state);
    showToast("بدأت محاكاة الامتحان — المؤقت يعمل الآن");
    rerenderCurrentRoute();
  }

  function markSimulationStep(key) {
    const level = key.split(":")[0];
    const session = state.simulations[level];
    if (!session?.plan?.some((step) => step.key === key)) return;
    if (!session.completed.includes(key)) session.completed.push(key);
    if (session.completed.length === session.plan.length) session.finishedAt = Date.now();
    saveState(state);
    renderHeader(activeRoute);
  }

  function syncSimulationForRoute(route) {
    if (!route.level) {
      Object.keys(state.simulations).forEach((level) => pauseSimulation(level));
      return;
    }
    const session = state.simulations[route.level];
    if (!session || session.finishedAt || session.pausedAt) return;
    const insideSimulation = route.area === "simulation" || isSimulationExercise(route, session);
    if (!insideSimulation) pauseSimulation(route.level);
  }

  function pauseSimulation(level) {
    const session = state.simulations[level];
    if (!session || session.finishedAt || session.pausedAt) return;
    session.pausedAt = Date.now();
    saveState(state);
  }

  function resumeSimulation(level) {
    const session = state.simulations[level];
    if (!session?.pausedAt || session.finishedAt) return;
    session.startedAt += Date.now() - session.pausedAt;
    delete session.pausedAt;
    saveState(state);
  }

  function renderHeader(route) {
    if (entryLink) entryLink.hidden = true;
    if (!headerRoot) return;
    headerRoot.hidden = false;
    const level = route.level;
    const session = level ? state.simulations[level] : null;
    const showTimer = session && (route.area === "simulation" || isSimulationExercise(route, session));
    headerRoot.innerHTML = [
      '<a href="#/level/A1">منصة التعلّم</a>',
      level && route.area ? `<a href="#/telc/${level}">لوحة ${level}</a>` : "",
      level ? `<a href="#/telc/${level}/simulation" class="telc-header-nav__simulation">محاكاة${showTimer ? ' · <time data-simulation-timer></time>' : ""}</a>` : "",
      level ? `<a href="#/telc/${level}/results">النتائج</a>` : "",
      level ? '<a href="#/telc">تغيير المستوى</a>' : "",
    ].join("");
    updateSimulationTimers();
  }

  function leave() {
    confirmationDialog.close(false);
    if (entryLink) entryLink.hidden = false;
    if (headerRoot) {
      headerRoot.hidden = true;
      headerRoot.innerHTML = "";
    }
  }

  function updateSimulationTimers() {
    document.querySelectorAll("[data-simulation-timer]").forEach((timer) => {
      const level = timer.closest("[data-simulation-level]")?.dataset.simulationLevel || activeRoute?.level;
      const session = state.simulations[level];
      timer.textContent = session ? formatRemaining(session) : "";
    });
  }

  window.setInterval(updateSimulationTimers, 1000);

  return { render, leave };
}

function createConfirmationDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "telc-confirm-dialog";
  dialog.setAttribute("aria-labelledby", "telc-confirm-title");
  dialog.setAttribute("aria-describedby", "telc-confirm-message");
  dialog.innerHTML = `<div class="telc-confirm-dialog__panel" dir="rtl">
    <span class="telc-confirm-dialog__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 8v5m0 3.5v.5M10.3 4.5 3.6 16.1A2 2 0 0 0 5.3 19h13.4a2 2 0 0 0 1.7-2.9L13.7 4.5a2 2 0 0 0-3.4 0Z"/></svg></span>
    <div><span class="telc-kicker">تأكيد الإجراء</span><h2 id="telc-confirm-title"></h2><p id="telc-confirm-message"></p></div>
    <div class="telc-confirm-dialog__actions"><button class="telc-quiet-button" type="button" data-dialog-cancel>إلغاء</button><button class="telc-submit-button" type="button" data-dialog-confirm></button></div>
  </div>`;
  document.body.append(dialog);
  const title = dialog.querySelector("#telc-confirm-title");
  const message = dialog.querySelector("#telc-confirm-message");
  const confirmButton = dialog.querySelector("[data-dialog-confirm]");
  const cancelButton = dialog.querySelector("[data-dialog-cancel]");
  let resolver = null;

  function settle(value) {
    if (!dialog.open) return;
    dialog.close();
    const resolve = resolver;
    resolver = null;
    resolve?.(value);
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) settle(false);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    settle(false);
  });
  cancelButton.addEventListener("click", () => settle(false));
  confirmButton.addEventListener("click", () => settle(true));

  return {
    open(content) {
      if (dialog.open) settle(false);
      title.textContent = content.title;
      message.textContent = content.message;
      confirmButton.textContent = content.confirmLabel;
      const result = new Promise((resolve) => { resolver = resolve; });
      dialog.showModal();
      cancelButton.focus();
      return result;
    },
    close(value = false) {
      settle(value);
    },
  };
}

async function loadLevel(level) {
  if (!dataCache.has(level)) {
    dataCache.set(level, fetch(`./src/data/telc/${level.toLowerCase()}.json`).then((response) => {
      if (!response.ok) throw new Error(`Unable to load TELC ${level} data`);
      return response.json();
    }));
  }
  return dataCache.get(level);
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return {
      answers: saved?.answers || {},
      drafts: saved?.drafts || {},
      results: saved?.results || {},
      completed: saved?.completed || {},
      simulations: saved?.simulations || {},
    };
  } catch {
    return { answers: {}, drafts: {}, results: {}, completed: {}, simulations: {} };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderLevelSelector(b1, b2, state) {
  return `<div class="telc-shell telc-selector">
    <header class="telc-hero">
      <span class="telc-kicker">Prüfungsstudio · استوديو الامتحانات</span>
      <h1>اختر مستوى امتحانك</h1>
      <p>تدرّب على بنية امتحان TELC الحقيقية، واحفظ إجاباتك وتقدمك تلقائيًا على هذا الجهاز.</p>
    </header>
    <div class="telc-level-grid">
      ${levelCard("B1", b1, state, "lime")}
      ${levelCard("B2", b2, state, "violet")}
    </div>
  </div>`;
}

function levelCard(level, data, state, accent) {
  const stats = levelStats(level, data, state);
  return `<a class="telc-level-card" data-accent="${accent}" href="#/telc/${level}" aria-label="فتح تدريب TELC ${level}">
    <div class="telc-level-card__head"><span class="telc-level-mark">${level}</span><span>${stats.completed}/${stats.total} مكتمل</span></div>
    <h2>TELC ${level}</h2>
    <p>Niveau ${level} · تدريب متكامل على أقسام الامتحان</p>
    <div class="telc-metric-row"><span><strong>${stats.total}</strong> مجموعة تدريب</span><span><strong>5</strong> مهارات</span><span><strong>${stats.percent}%</strong> تقدم</span></div>
    <div class="telc-progress" aria-label="تقدم ${level}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}"><span style="width:${stats.percent}%"></span></div>
    <span class="telc-primary-link">ابدأ تدريب ${level}<span aria-hidden="true">←</span></span>
  </a>`;
}

function renderDashboard(level, data, state) {
  const stats = levelStats(level, data, state);
  return `<div class="telc-shell">
    <header class="telc-dashboard-hero">
      <div><span class="telc-kicker">TELC Deutsch ${level}</span><h1>مساحة تدريبك للامتحان</h1><p>اختر المهارة، أكمل التمارين بالترتيب، وارجع في أي وقت لتجد إجاباتك محفوظة.</p></div>
      <div class="telc-progress-card"><strong>${stats.percent}%</strong><span>${stats.completed} من ${stats.total} مجموعة مكتملة</span><div class="telc-progress"><span style="width:${stats.percent}%"></span></div></div>
    </header>
    <section class="telc-area-grid" aria-label="أقسام امتحان TELC ${level}">
      ${Object.entries(AREA_META).map(([key, area]) => areaCard(level, key, area, data, state)).join("")}
    </section>
    ${renderSimulationCard(level, data, state)}
  </div>`;
}

function renderSimulationCard(level, data, state) {
  const session = state.simulations[level];
  const moduleCount = Object.keys(data.modules).length;
  const completed = session?.completed?.length || 0;
  return `<section class="telc-simulation-card" data-simulation-level="${level}">
    <div class="telc-simulation-card__copy"><span class="telc-kicker">Prüfungssimulation · محاكاة الامتحان</span><h2>اختبر استعدادك في جلسة كاملة</h2><p>تمرين واحد من كل جزء، مؤقت مستمر، وإجابات محفوظة حتى عند مغادرة الصفحة.</p></div>
    <div class="telc-simulation-card__status"><strong>${session ? `${completed}/${moduleCount}` : moduleCount}</strong><span>${session ? `أجزاء مكتملة${session.pausedAt ? " · متوقفة مؤقتًا" : ""}` : "أجزاء الامتحان"}</span></div>
    <a class="telc-primary-link" href="#/telc/${level}/simulation">${session ? "تابع المحاكاة" : "ابدأ المحاكاة"}<span aria-hidden="true">←</span></a>
  </section>`;
}

function renderSimulation(level, data, state) {
  const session = state.simulations[level];
  if (!session) {
    return `<div class="telc-shell telc-simulation" data-simulation-level="${level}">
      <header class="telc-simulation-hero"><span class="telc-kicker">TELC ${level} · Prüfungssimulation</span><h1>محاكاة امتحان كاملة</h1><p>سنختار تمرينًا من كل جزء من أجزاء الامتحان. يعمل المؤقت باستمرار، وتبقى إجاباتك محفوظة محليًا إذا غادرت وعدت لاحقًا.</p></header>
      <section class="telc-simulation-overview"><div><strong>${Object.keys(data.modules).length}</strong><span>أجزاء امتحانية</span></div><div><strong>${level === "B1" ? "150" : "180"}</strong><span>دقيقة</span></div><div><strong>∞</strong><span>إعادة بلا حدود</span></div></section>
      <button class="telc-primary-link telc-simulation-start" type="button" data-simulation-start="${level}">ابدأ المحاكاة الآن</button>
    </div>`;
  }

  const finished = session.completed.length === session.plan.length;
  const paused = Boolean(session.pausedAt) && !finished;
  return `<div class="telc-shell telc-simulation" data-simulation-level="${level}">
    <header class="telc-simulation-hero"><span class="telc-kicker">TELC ${level} · Prüfungssimulation</span><h1>${finished ? "اكتملت المحاكاة" : paused ? "المحاكاة متوقفة مؤقتًا" : "المحاكاة قيد التنفيذ"}</h1><p>${finished ? "أكملت جميع أجزاء هذه الجلسة. يمكنك مراجعة إجاباتك أو بدء جلسة جديدة." : paused ? "المؤقت متوقف وإجاباتك محفوظة. استأنف عندما تكون جاهزًا." : "أكمل الأجزاء بالترتيب الذي يناسبك. المؤقت والتقدم محفوظان تلقائيًا."}</p><time class="telc-simulation-clock" data-simulation-timer aria-live="polite"></time><div class="telc-simulation-controls">${finished ? "" : `<button class="telc-submit-button" type="button" data-simulation-toggle="${level}">${paused ? "استئناف المؤقت" : "إيقاف المؤقت"}</button>`}<button class="telc-quiet-button" type="button" data-simulation-reset="${level}">بدء محاكاة جديدة</button></div></header>
    <section class="telc-simulation-plan" aria-label="أجزاء المحاكاة">${session.plan.map((step, index) => {
      const complete = session.completed.includes(step.key);
      return `<a class="telc-simulation-step ${complete ? "is-complete" : ""}" href="#/telc/${level}/${step.area}/${step.module}/${step.index}"><span>${String(index + 1).padStart(2, "0")}</span><div><small>${MODULE_LABELS[step.module]}</small><h2>${escapeHtml(step.title)}</h2></div><strong>${complete ? "مكتمل ✓" : "ابدأ"}</strong></a>`;
    }).join("")}</section>
  </div>`;
}

function renderResults(level, data, state) {
  const stats = levelStats(level, data, state);
  const scored = Object.entries(state.results).filter(([key]) => key.startsWith(`${level}:`));
  const correct = scored.reduce((sum, [, result]) => sum + result.score, 0);
  const total = scored.reduce((sum, [, result]) => sum + result.total, 0);
  const average = total ? Math.round((correct / total) * 100) : 0;
  return `<div class="telc-shell">
    <header class="telc-library-head"><span class="telc-kicker">Ergebnisse · النتائج</span><h1>تقدمك في TELC ${level}</h1><p>ملخص محلي مبني على التمارين التي صححتها أو أكملتها على هذا الجهاز.</p></header>
    <section class="telc-results-summary">
      <article><span>الإنجاز</span><strong>${stats.percent}%</strong><p>${stats.completed} من ${stats.total} مجموعة</p></article>
      <article><span>متوسط التصحيح</span><strong>${average}%</strong><p>${correct} من ${total || 0} إجابة صحيحة</p></article>
      <article><span>محاولات مصححة</span><strong>${scored.length}</strong><p>يمكنك إعادة أي تمرين بلا حدود</p></article>
    </section>
    <section class="telc-result-breakdown">${Object.entries(AREA_META).map(([areaKey, area]) => {
      const moduleNames = new Set(area.modules);
      const areaResults = scored.filter(([key]) => moduleNames.has(key.split(":")[1]));
      const areaCorrect = areaResults.reduce((sum, [, result]) => sum + result.score, 0);
      const areaTotal = areaResults.reduce((sum, [, result]) => sum + result.total, 0);
      const percent = areaTotal ? Math.round((areaCorrect / areaTotal) * 100) : 0;
      return `<a href="#/telc/${level}/${areaKey}"><div><span>${area.de}</span><h2>${area.label}</h2></div><strong>${areaTotal ? `${percent}%` : "—"}</strong></a>`;
    }).join("")}</section>
  </div>`;
}

function areaCard(level, key, area, data, state) {
  const keys = area.modules.flatMap((module) => (data.modules[module] || []).map((item) => exerciseKey(level, module, item)));
  const completed = keys.filter((itemKey) => state.completed[itemKey]).length;
  return `<a class="telc-area-card" data-accent="${area.accent}" href="#/telc/${level}/${key}">
    <div class="telc-area-card__top"><span class="telc-area-index">${String(Object.keys(AREA_META).indexOf(key) + 1).padStart(2, "0")}</span><span>${completed}/${keys.length}</span></div>
    <h2>${area.label}</h2><strong>${area.de}</strong><p>${area.description}</p>
    <div class="telc-area-card__footer"><span>${keys.length} مجموعة</span><span aria-hidden="true">←</span></div>
  </a>`;
}

function renderLibrary(level, areaKey, data, state, selectedModule) {
  const area = AREA_META[areaKey];
  const modules = selectedModule && area.modules.includes(selectedModule) ? [selectedModule] : area.modules;
  return `<div class="telc-shell">
    <header class="telc-library-head"><span class="telc-kicker">${area.de}</span><h1>${area.label}</h1><p>${area.description}</p></header>
    <nav class="telc-module-tabs" aria-label="أجزاء ${area.de}">
      <a class="${selectedModule ? "" : "is-active"}" href="#/telc/${level}/${areaKey}">الكل</a>
      ${area.modules.map((module) => `<a class="${selectedModule === module ? "is-active" : ""}" href="#/telc/${level}/${areaKey}/${module}">${MODULE_LABELS[module]}</a>`).join("")}
    </nav>
    ${modules.map((module) => exerciseSection(level, areaKey, module, data.modules[module] || [], state)).join("")}
  </div>`;
}

function exerciseSection(level, areaKey, module, items, state) {
  return `<section class="telc-exercise-section"><div class="telc-section-heading"><div><span>Prüfungsteil</span><h2>${MODULE_LABELS[module]}</h2></div><strong>${items.length} مجموعة</strong></div>
    <div class="telc-exercise-grid">${items.map((item, index) => {
      const key = exerciseKey(level, module, item);
      const result = state.results[key];
      const complete = Boolean(state.completed[key]);
      return `<a class="telc-exercise-card ${complete ? "is-complete" : ""}" href="#/telc/${level}/${areaKey}/${module}/${index}">
        <span class="telc-exercise-number">${String(index + 1).padStart(2, "0")}</span>
        <div><h3>${escapeHtml(exerciseTitle(item))}</h3><p>${exerciseSubtitle(module, item)}</p></div>
        <span class="telc-exercise-status">${result ? `${result.score}/${result.total}` : complete ? "مكتمل" : "ابدأ"}</span>
      </a>`;
    }).join("")}</div></section>`;
}

function renderExercise(level, areaKey, module, index, item, total, state) {
  const key = exerciseKey(level, module, item);
  const expected = expectedAnswers(module, item);
  const saved = state.answers[key] || {};
  const result = state.results[key];
  const complete = Boolean(state.completed[key]);
  const body = renderExerciseBody(module, item, key, saved, result, state.drafts[key] || "");
  const previous = index > 0 ? `#/telc/${level}/${areaKey}/${module}/${index - 1}` : null;
  const next = index + 1 < total ? `#/telc/${level}/${areaKey}/${module}/${index + 1}` : `#/telc/${level}/${areaKey}/${module}`;

  return `<div class="telc-shell telc-exam-shell" data-exercise-key="${escapeAttribute(key)}" data-expected="${escapeAttribute(JSON.stringify(expected))}">
    <header class="telc-exam-head"><div><span class="telc-kicker">${MODULE_LABELS[module]} · ${index + 1}/${total}</span><h1>${escapeHtml(exerciseTitle(item))}</h1></div><span data-saved-indicator>يُحفظ تلقائيًا</span></header>
    ${result ? `<div class="telc-result ${result.percent >= 60 ? "is-pass" : "is-review"}"><strong>${result.score}/${result.total}</strong><span>${result.percent >= 60 ? "أحسنت — نتيجة ناجحة" : "راجع الإجابات وحاول مجددًا"}</span><em>${result.percent}%</em></div>` : ""}
    ${body}
    <footer class="telc-exam-actions">
      <div><a class="telc-secondary-link" href="#/telc/${level}/${areaKey}/${module}">العودة للقائمة</a>${previous ? `<a class="telc-secondary-link" href="${previous}">السابق</a>` : ""}<a class="telc-secondary-link" href="${next}">التالي</a></div>
      <div><button class="telc-quiet-button" type="button" data-telc-reset="${escapeAttribute(key)}">إعادة الضبط</button><button class="telc-submit-button" type="button" data-telc-${expected ? "submit" : "complete"}="${escapeAttribute(key)}">${expected ? "تصحيح الإجابات" : complete ? "تم الإنجاز ✓" : "حفظ كمنجز"}</button></div>
    </footer>
  </div>`;
}

function renderExerciseBody(module, item, key, saved, result, draft) {
  if (module === "lesenTeil1") return renderHeadingMatch(item, saved, result);
  if (module === "lesenTeil2") return renderReadingChoice(item, saved, result);
  if (module === "lesenTeil3") return renderSituationMatch(item, saved, result);
  if (module === "sprachbausteineTeil1") return renderGapOptions(item, saved, result);
  if (module === "sprachbausteineTeil2") return renderWordBank(item, saved, result);
  if (module.startsWith("hoeren")) return renderListening(item, saved, result);
  if (module === "schreiben") return renderWriting(item, key, draft);
  return renderSpeaking(item, key, draft);
}

function renderHeadingMatch(item, saved, result) {
  const letters = item.headings.map((_, index) => String.fromCharCode(97 + index));
  const headingLabels = Object.fromEntries(letters.map((letter, index) => [letter, item.headings[index]]));
  return `<div class="telc-workspace"><main class="telc-content-stack">${item.texte.map((text, index) => {
    const question = String(index);
    return `<article class="telc-text-card ${feedbackClass(result, saved[question], item.answers[index])}"><div class="telc-text-card__answer"><span>Text ${index + 1}</span>${selectControl(question, letters, saved[question], "اختر العنوان", headingLabels)}</div>${formatRichText(text)}</article>`;
  }).join("")}</main><aside class="telc-reference-panel"><h2>Überschriften</h2>${item.headings.map((heading, index) => `<div class="telc-heading-option"><strong>${letters[index].toUpperCase()}</strong><span>${inlineRichText(heading)}</span></div>`).join("")}</aside></div>`;
}

function renderReadingChoice(item, saved, result) {
  const variant = item.variants?.[0];
  const questions = item.questions || variant?.fragen || [];
  return `<div class="telc-workspace"><article class="telc-reading-paper">${formatRichText(item.text)}</article><aside class="telc-question-panel"><h2>Aufgaben</h2>${questions.map((question, index) => {
    const options = question.opts || question.options || [];
    const expected = question.answer ?? question.correct;
    return radioQuestion(String(index), question.text, options, saved[String(index)], expected, result, typeof expected === "number" ? "index" : "letter");
  }).join("")}</aside></div>`;
}

function renderSituationMatch(item, saved, result) {
  const materials = item.anzeigen || item.infotexts || {};
  const keys = Object.keys(materials);
  return `<div class="telc-workspace"><main class="telc-content-stack">${item.situations.map((situation, index) => `<article class="telc-situation-card ${feedbackClass(result, saved[String(index)], situation.answer)}"><span>${situation.id ?? index + 1}</span><div>${inlineRichText(situation.text)}</div>${selectControl(String(index), keys, saved[String(index)], "اختر الإعلان")}</article>`).join("")}</main><aside class="telc-reference-panel telc-reference-panel--wide"><h2>Anzeigen</h2>${keys.map((letter) => `<details><summary><strong>${letter}</strong> Anzeige ${letter}</summary>${formatRichText(materials[letter])}</details>`).join("")}</aside></div>`;
}

function renderGapOptions(item, saved, result) {
  return `<div class="telc-workspace"><article class="telc-reading-paper">${formatRichText(item.briefText)}</article><aside class="telc-question-panel"><h2>Lücken</h2>${item.items.map((gap, index) => radioQuestion(String(index), `Lücke ${gap.id}`, gap.opts || [], saved[String(index)], gap.answer, result, "letter")).join("")}</aside></div>`;
}

function renderWordBank(item, saved, result) {
  const words = item.woerter || {};
  const keys = Object.keys(words);
  return `<div class="telc-workspace"><article class="telc-reading-paper">${formatRichText(item.briefText)}</article><aside class="telc-question-panel"><h2>Wortbank</h2><div class="telc-word-bank">${keys.map((letter) => `<span><strong>${letter.toUpperCase()}</strong>${escapeHtml(words[letter])}</span>`).join("")}</div>${item.items.map((gap, index) => `<label class="telc-select-question ${feedbackClass(result, saved[String(index)], gap.answer)}"><span>Lücke ${gap.id}</span>${selectControl(String(index), keys, saved[String(index)], "اختر الكلمة", words)}</label>`).join("")}</aside></div>`;
}

function renderListening(item, saved, result) {
  const items = item.items || (item.aussagen || []).map((text, index) => ({ id: index + 1, text }));
  const hasAnswers = items.every((entry) => typeof entry.answer === "boolean");
  return `<div class="telc-workspace"><main class="telc-content-stack"><section class="telc-listening-intro"><span>Hörtraining</span><h2>${escapeHtml(item.title || item.name)}</h2><p>${hasAnswers ? "اقرأ العبارات ثم اختر صحيح أو خطأ. يمكنك فتح نص الاستماع عند الحاجة." : "هذه المجموعة مخصصة للتدريب الذاتي. استمع إلى المادة المرتبطة بالكود ثم علّم العبارات التي راجعتها."}</p>${item.code ? `<strong>Audio-Code: ${escapeHtml(item.code)}</strong>` : ""}</section>${item.hoertext ? `<details class="telc-transcript"><summary>إظهار نص الاستماع · Hörtext</summary>${formatRichText(item.hoertext)}</details>` : ""}</main><aside class="telc-question-panel"><h2>Aussagen</h2>${items.map((entry, index) => hasAnswers ? radioQuestion(String(index), entry.text, ["Richtig", "Falsch"], saved[String(index)], entry.answer, result, "boolean") : `<label class="telc-self-check"><input type="checkbox" data-telc-answer="${index}" value="reviewed" ${saved[String(index)] ? "checked" : ""}><span>${escapeHtml(entry.text)}</span></label>`).join("")}</aside></div>`;
}

function renderWriting(item, key, draft) {
  return `<div class="telc-writing-layout"><section class="telc-prompt-card"><span>Situation</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.situation)}</p>${item.anzeige ? `<blockquote>${escapeHtml(item.anzeige)}</blockquote>` : ""}<h3>Behandeln Sie diese Punkte:</h3><ol>${item.punkte.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ol></section><section class="telc-editor-card"><label for="telc-draft">Ihre Antwort</label><textarea id="telc-draft" data-telc-draft="${escapeAttribute(key)}" placeholder="Schreiben Sie hier Ihre Antwort …">${escapeHtml(draft)}</textarea><div><span>${draft.length} Zeichen</span><span>المسودة محفوظة تلقائيًا</span></div></section></div>`;
}

function renderSpeaking(item, key, draft) {
  const planningPoints = item.teil3s || item.teil3_stichworte || [];
  return `<div class="telc-speaking-layout"><section class="telc-prompt-card"><span>Thema</span><h2>${escapeHtml(item.titel || item.thema)}</h2>${item.mA ? `<div class="telc-opinion-grid"><article><strong>${escapeHtml(item.mA.name)}</strong>${formatRichText(item.mA.text)}</article><article><strong>${escapeHtml(item.mB?.name || "Position B")}</strong>${formatRichText(item.mB?.text || "")}</article></div>` : item.teil2 ? `<div class="telc-speaking-text">${formatRichText(item.teil2)}</div>` : ""}<h3>Gemeinsam planen</h3><p>${escapeHtml(item.teil3 || "")}</p>${planningPoints.length ? `<ul>${planningPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}</section><section class="telc-editor-card"><label for="telc-notes">Notizen und Redemittel</label><textarea id="telc-notes" data-telc-draft="${escapeAttribute(key)}" placeholder="Notieren Sie Argumente, Beispiele und Redemittel …">${escapeHtml(draft)}</textarea><div><span>${draft.length} Zeichen</span><span>تُحفظ ملاحظاتك تلقائيًا</span></div></section></div>`;
}

function radioQuestion(questionKey, prompt, options, saved, expected, result, mode) {
  return `<fieldset class="telc-radio-question"><legend>${escapeHtml(prompt)}</legend>${options.map((option, index) => {
    const value = mode === "boolean" ? String(index === 0) : mode === "index" ? String(index) : String.fromCharCode(97 + index);
    const stateClass = result ? String(value) === String(expected) ? "is-correct" : String(saved) === value ? "is-wrong" : "" : "";
    return `<label class="${stateClass}"><input type="radio" name="q-${questionKey}" data-telc-answer="${questionKey}" value="${value}" ${String(saved) === value ? "checked" : ""}><span>${escapeHtml(option)}</span></label>`;
  }).join("")}</fieldset>`;
}

function selectControl(question, options, saved, placeholder, labels = null) {
  const selected = options.find((value) => String(saved) === String(value));
  const displayLabel = selected == null ? placeholder : optionDisplayLabel(selected, labels);
  const listboxId = `telc-select-${question}-${Math.random().toString(36).slice(2, 8)}`;
  return `<div class="telc-custom-select" data-telc-custom-select data-question="${escapeAttribute(question)}">
    <button class="telc-custom-select__trigger ${selected == null ? "" : "has-value"}" type="button" data-telc-select-trigger aria-haspopup="listbox" aria-expanded="false" aria-controls="${listboxId}" aria-label="${escapeAttribute(placeholder)}"><span data-telc-select-label>${escapeHtml(displayLabel)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>
    <div class="telc-custom-select__menu" id="${listboxId}" role="listbox" data-telc-select-menu hidden>${options.map((value) => {
      const isSelected = String(saved) === String(value);
      const title = labels ? stripFormatting(labels[value]) : "";
      const display = optionDisplayLabel(value, labels);
      return `<button class="telc-custom-select__option ${isSelected ? "is-selected" : ""}" type="button" role="option" aria-selected="${isSelected}" data-telc-select-option data-value="${escapeAttribute(value)}" data-display="${escapeAttribute(display)}" title="${escapeAttribute(display)}"><strong>${escapeHtml(String(value).toUpperCase())}</strong>${title ? `<span>${escapeHtml(title)}</span>` : ""}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>`;
    }).join("")}</div>
  </div>`;
}

function optionDisplayLabel(value, labels) {
  const letter = String(value).toUpperCase();
  const title = labels ? stripFormatting(labels[value]) : "";
  return title ? `${letter} · ${title}` : letter;
}

function stripFormatting(value) {
  return String(value ?? "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function expectedAnswers(module, item) {
  if (module === "lesenTeil1") return Object.fromEntries(item.answers.map((answer, index) => [String(index), answer]));
  if (module === "lesenTeil2") {
    const questions = item.questions || item.variants?.[0]?.fragen || [];
    return Object.fromEntries(questions.map((question, index) => [String(index), question.answer ?? question.correct]));
  }
  if (module === "lesenTeil3") return Object.fromEntries(item.situations.map((entry, index) => [String(index), entry.answer]));
  if (module.startsWith("sprachbausteine")) return Object.fromEntries(item.items.map((entry, index) => [String(index), entry.answer]));
  if (module.startsWith("hoeren") && item.items?.every((entry) => typeof entry.answer === "boolean")) return Object.fromEntries(item.items.map((entry, index) => [String(index), String(entry.answer)]));
  return null;
}

function levelStats(level, data, state) {
  const keys = Object.entries(data.modules).flatMap(([module, items]) => items.map((item) => exerciseKey(level, module, item)));
  const completed = keys.filter((key) => state.completed[key]).length;
  return { total: keys.length, completed, percent: keys.length ? Math.round((completed / keys.length) * 100) : 0 };
}

function exerciseKey(level, module, item) {
  return `${level}:${module}:${item.key ?? item.id}`;
}

function exerciseTitle(item) {
  return item.title || item.titel || item.name || item.thema || "Übung";
}

function exerciseSubtitle(module, item) {
  if (module === "schreiben") return `${item.punkte?.length || 0} نقاط للمعالجة`;
  if (module === "sprechen") return escapeHtml(item.thema || "Mündliche Prüfung");
  if (item.items) return `${item.items.length} Aufgaben`;
  if (item.texte) return `${item.texte.length} Texte · ${item.headings.length} Überschriften`;
  if (item.situations) return `${item.situations.length} Situationen`;
  if (item.aussagen) return `${item.aussagen.length} Aussagen`;
  return MODULE_LABELS[module];
}

function feedbackClass(result, answer, expected) {
  if (!result || answer == null) return "";
  return String(answer) === String(expected) ? "is-correct" : "is-wrong";
}

function areaForModule(module) {
  return Object.entries(AREA_META).find(([, area]) => area.modules.includes(module))?.[0] || "lesen";
}

function isSimulationExercise(route, session) {
  if (!route?.module || route.exercise == null || !session?.plan) return false;
  return session.plan.some((step) => step.module === route.module && String(step.index) === String(route.exercise));
}

function formatRemaining(session) {
  if (session.finishedAt) return "مكتمل";
  const referenceTime = session.pausedAt || Date.now();
  const elapsed = Math.floor((referenceTime - session.startedAt) / 1000);
  const remaining = Math.max(0, session.durationSeconds - elapsed);
  if (remaining === 0) return "انتهى الوقت";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function loadingMarkup() {
  return `<div class="telc-loading"><span></span><p>جارٍ تجهيز استوديو الامتحان…</p></div>`;
}

function inlineRichText(value) {
  return escapeHtml(value ?? "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function formatRichText(value) {
  return String(value ?? "").split(/\n{2,}/).map((paragraph) => `<p>${inlineRichText(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
