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

export function createTelcApp({ root, headerRoot, entryLink, showToast = () => { } }) {
  const state = readState();
  let renderToken = 0;
  let activeRoute = null;
  const confirmationDialog = createConfirmationDialog();

  root.addEventListener("change", handleChange);
  root.addEventListener("input", handleInput);
  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleKeydown);
  root.addEventListener("pointerup", handleVocabularySelection);
  root.addEventListener("touchend", handleVocabularySelection);
  root.addEventListener("keyup", handleVocabularySelection);
  root.addEventListener("pointerover", handleVocabularyPointerOver);
  root.addEventListener("pointerout", handleVocabularyPointerOut);
  root.addEventListener("focusin", handleVocabularyFocusIn);
  root.addEventListener("focusout", handleVocabularyFocusOut);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("click", handleHeaderMenuClick);
  document.addEventListener("keydown", handleHeaderMenuKeydown);

  async function render(route) {
    activeRoute = route;
    syncSimulationForRoute(route);
    hideVocabularyPopover();
    renderHeader(route);
    const token = ++renderToken;
    root.innerHTML = loadingMarkup();

    if (!route.level) {
      let b1;
      let b2;
      let c1;
      try {
        [b1, b2, c1] = await Promise.all([loadLevel("B1"), loadLevel("B2"), loadLevel("C1")]);
      } catch (error) {
        if (token !== renderToken) return;
        root.innerHTML = renderLoadError(error);
        return;
      }
      if (token !== renderToken) return;
      root.innerHTML = renderLevelSelector(b1, b2, c1, state);
      document.title = "TELC Prüfungsstudio | Deutsch mit Rinkute";
      return;
    }

    let data;
    try {
      data = await loadLevel(route.level);
    } catch (error) {
      if (token !== renderToken) return;
      root.innerHTML = renderLoadError(error);
      return;
    }
    if (token !== renderToken) return;

    if (!route.area) {
      root.innerHTML = renderDashboard(route.level, data, state);
      document.title = `TELC ${route.level} | Deutsch mit Rinkute`;
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
    if (!modulesForArea(route.level, route.area, data).includes(route.module) || !items || !Number.isInteger(index) || !items[index] || items[index].externalUrl) {
      location.hash = `#/telc/${route.level}/${route.area}`;
      return;
    }

    try {
      root.innerHTML = renderExercise(route.level, route.area, route.module, index, items[index], items.length, state);
      restoreVocabularyHighlights();
      document.title = `${exerciseTitle(items[index])} · TELC ${route.level}`;
    } catch (error) {
      console.error("TELC exercise render failed", error);
      if (token === renderToken) root.innerHTML = renderLoadError(error);
    }
  }

  let selectedVocabularyRange = null;
  let activeVocabularyMark = null;
  let vocabularyPopoverPinned = false;

  function handleVocabularySelection(event) {
    if (!root.querySelector("[data-vocabulary-enabled]")) return;
    if (event.target.closest?.("[data-vocab-selection-action], [data-vocab-popover]")) return;
    if (event.type === "keyup" && (!event.shiftKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      hideVocabularySelectionAction();
      return;
    }
    const range = selection.getRangeAt(0);
    const passage = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer.closest?.("[data-vocabulary-passage]")
      : range.commonAncestorContainer.parentElement?.closest("[data-vocabulary-passage]");
    if (!passage || !root.contains(passage) || !passage.contains(range.startContainer) || !passage.contains(range.endContainer)) {
      hideVocabularySelectionAction();
      return;
    }
    const model = buildPassageTextModel(passage);
    let start = passageOffsetAt(model, range.startContainer, range.startOffset);
    let end = passageOffsetAt(model, range.endContainer, range.endOffset);
    while (start < end && /\s/u.test(model.text[start])) start += 1;
    while (end > start && /\s/u.test(model.text[end - 1])) end -= 1;
    if (start >= end || !model.text.slice(start, end).trim()) {
      hideVocabularySelectionAction();
      return;
    }

    selectedVocabularyRange = {
      exerciseId: root.querySelector("[data-exercise-key]")?.dataset.exerciseKey,
      passageId: passage.dataset.vocabularyPassage,
      passageText: model.text,
      start,
      end,
      selectedText: model.text.slice(start, end),
      rect: range.getBoundingClientRect(),
    };
    const action = root.querySelector("[data-vocab-selection-action]");
    if (!action) return;
    action.hidden = false;
    placeVocabularyPopup(action, selectedVocabularyRange.rect);
  }

  function handleVocabularyPointerOver(event) {
    const mark = event.target.closest?.("[data-vocabulary-mark]");
    if (!mark || mark.contains(event.relatedTarget) || vocabularyPopoverPinned) return;
    openVocabularyPopover(mark, false);
  }

  function handleVocabularyPointerOut(event) {
    const mark = event.target.closest?.("[data-vocabulary-mark]");
    const popover = root.querySelector("[data-vocab-popover]");
    if (mark && !mark.contains(event.relatedTarget) && !popover?.contains(event.relatedTarget)) {
      if (!vocabularyPopoverPinned && !mark.matches(":focus")) hideVocabularyPopover();
    }
    if (popover?.contains(event.target) && !popover.contains(event.relatedTarget) && !vocabularyPopoverPinned) {
      hideVocabularyPopover();
    }
  }

  function handleVocabularyFocusIn(event) {
    const mark = event.target.closest?.("[data-vocabulary-mark]");
    if (mark && !vocabularyPopoverPinned) openVocabularyPopover(mark, false);
  }

  function handleVocabularyFocusOut(event) {
    const popover = root.querySelector("[data-vocab-popover]");
    if (popover?.contains(event.target) && !popover.contains(event.relatedTarget) && !vocabularyPopoverPinned) {
      hideVocabularyPopover();
    }
    const mark = event.target.closest?.("[data-vocabulary-mark]");
    if (mark && !mark.contains(event.relatedTarget) && !vocabularyPopoverPinned && !popover?.contains(event.relatedTarget)) {
      hideVocabularyPopover();
    }
  }

  function handleVocabularyClick(event) {
    const markAction = event.target.closest("[data-vocab-mark-selection]");
    if (markAction) {
      if (!selectedVocabularyRange) return;
      const action = root.querySelector("[data-vocab-selection-action]");
      if (action) action.hidden = true;
      openVocabularyEntry(selectedVocabularyRange);
      return true;
    }

    const saveButton = event.target.closest("[data-vocab-save]");
    if (saveButton) {
      saveVocabularyAnnotation();
      return true;
    }

    const cancelEntry = event.target.closest("[data-vocab-cancel-entry]");
    if (cancelEntry) {
      hideVocabularyPopover();
      return true;
    }

    const annotationMark = event.target.closest("[data-vocabulary-mark]");
    if (annotationMark) {
      openVocabularyPopover(annotationMark, true);
      return true;
    }

    const showTranslation = event.target.closest("[data-vocab-show-translation]");
    if (showTranslation) {
      const translation = root.querySelector("[data-vocab-translation]");
      if (translation) translation.hidden = !translation.hidden;
      showTranslation.textContent = translation?.hidden ? "إظهار الترجمة" : "إخفاء الترجمة";
      return true;
    }

    const editTranslation = event.target.closest("[data-vocab-edit]");
    if (editTranslation) {
      const annotation = state.vocabulary[activeVocabularyMark];
      const form = root.querySelector("[data-vocab-entry]");
      const field = root.querySelector("[data-vocab-translation-input]");
      if (!annotation || !form || !field) return true;
      form.hidden = false;
      root.querySelector("[data-vocab-annotation-actions]").hidden = true;
      field.value = annotation.translation;
      field.focus();
      return true;
    }

    const learn = event.target.closest("[data-vocab-learn]");
    if (learn) {
      delete state.vocabulary[activeVocabularyMark];
      saveState(state);
      hideVocabularyPopover();
      restoreVocabularyHighlights();
      showToast("تمت إزالة الكلمة من النص");
      return true;
    }

    const close = event.target.closest("[data-vocab-close]");
    if (close) {
      const markId = activeVocabularyMark;
      hideVocabularyPopover();
      [...root.querySelectorAll("[data-vocabulary-mark]")].find((mark) => mark.dataset.vocabularyMark === markId)?.focus();
      return true;
    }

    return false;
  }

  function openVocabularyEntry(selection) {
    const popover = root.querySelector("[data-vocab-popover]");
    const form = root.querySelector("[data-vocab-entry]");
    if (!popover || !form) return;
    activeVocabularyMark = null;
    vocabularyPopoverPinned = true;
    root.querySelector("[data-vocab-annotation-actions]").hidden = true;
    root.querySelector("[data-vocab-translation-container]").hidden = true;
    root.querySelector("[data-vocab-selected-text]").textContent = selection.selectedText;
    root.querySelector("[data-vocab-selected-text]").closest("[data-vocab-selected]").hidden = false;
    form.hidden = false;
    popover.hidden = false;
    const field = root.querySelector("[data-vocab-translation-input]");
    field.value = "";
    placeVocabularyPopup(popover, selection.rect);
    field.focus();
  }

  function openVocabularyPopover(mark, pinned) {
    const annotation = state.vocabulary[mark.dataset.vocabularyMark];
    const popover = root.querySelector("[data-vocab-popover]");
    if (!annotation || !popover) return;
    selectedVocabularyRange = null;
    hideVocabularySelectionAction();
    activeVocabularyMark = annotation.id;
    vocabularyPopoverPinned = pinned;
    root.querySelector("[data-vocab-entry]").hidden = true;
    root.querySelector("[data-vocab-selected]").hidden = true;
    root.querySelector("[data-vocab-translation]").textContent = annotation.translation;
    root.querySelector("[data-vocab-translation-container]").hidden = false;
    root.querySelector("[data-vocab-translation]").hidden = false;
    const actions = root.querySelector("[data-vocab-annotation-actions]");
    actions.hidden = !pinned;
    const showButton = root.querySelector("[data-vocab-show-translation]");
    showButton.textContent = "إخفاء الترجمة";
    popover.hidden = false;
    placeVocabularyPopup(popover, mark.getBoundingClientRect());
    if (pinned) showButton.focus();
  }

  function saveVocabularyAnnotation() {
    const selection = selectedVocabularyRange;
    const field = root.querySelector("[data-vocab-translation-input]");
    const translation = field?.value.trim();
    if (!translation) {
      field?.focus();
      showToast("أدخل معنى الكلمة أولًا");
      return;
    }

    if (activeVocabularyMark) {
      const annotation = state.vocabulary[activeVocabularyMark];
      if (!annotation) return;
      annotation.translation = translation;
      annotation.updatedAt = new Date().toISOString();
      saveState(state);
      hideVocabularyPopover();
      restoreVocabularyHighlights();
      [...root.querySelectorAll("[data-vocabulary-mark]")].find((mark) => mark.dataset.vocabularyMark === annotation.id)?.focus();
      showToast("تم تحديث الترجمة");
      return;
    }
    if (!selection) return;

    const overlaps = Object.values(state.vocabulary).some((annotation) =>
      annotation.exerciseId === selection.exerciseId
      && annotation.passageId === selection.passageId
      && selection.start < annotation.end
      && selection.end > annotation.start
    );
    if (overlaps) {
      showToast("هذا الجزء محدد بالفعل؛ اختر نصًا آخر");
      return;
    }

    const now = new Date().toISOString();
    const id = createVocabularyId();
    state.vocabulary[id] = {
      id,
      exerciseId: selection.exerciseId,
      passageId: selection.passageId,
      selectedText: selection.selectedText,
      start: selection.start,
      end: selection.end,
      passageText: selection.passageText,
      translation,
      createdAt: now,
      updatedAt: now,
    };
    saveState(state);
    hideVocabularyPopover();
    selectedVocabularyRange = null;
    restoreVocabularyHighlights();
    [...root.querySelectorAll("[data-vocabulary-mark]")].find((mark) => mark.dataset.vocabularyMark === id)?.focus();
    showToast("تم حفظ الكلمة");
  }

  function restoreVocabularyHighlights() {
    root.querySelectorAll("[data-vocabulary-mark]").forEach((mark) => {
      mark.replaceWith(...mark.childNodes);
    });
    const passages = new Map([...root.querySelectorAll("[data-vocabulary-passage]")].map((passage) => [passage.dataset.vocabularyPassage, passage]));
    const annotations = Object.values(state.vocabulary)
      .filter((annotation) => annotation.exerciseId === root.querySelector("[data-exercise-key]")?.dataset.exerciseKey)
      .sort((left, right) => right.start - left.start);
    for (const annotation of annotations) {
      const passage = passages.get(annotation.passageId);
      if (!passage) continue;
      const model = buildPassageTextModel(passage);
      if (model.text !== annotation.passageText || model.text.slice(annotation.start, annotation.end) !== annotation.selectedText) continue;
      const segments = model.segments.filter((segment) => segment.start < annotation.end && segment.end > annotation.start).reverse();
      let first = true;
      for (const segment of segments) {
        const start = Math.max(annotation.start, segment.start) - segment.start;
        const end = Math.min(annotation.end, segment.end) - segment.start;
        if (start >= end) continue;
        const range = document.createRange();
        range.setStart(segment.node, start);
        range.setEnd(segment.node, end);
        const mark = document.createElement("span");
        mark.className = "telc-vocab-mark";
        mark.dataset.vocabularyMark = annotation.id;
        mark.tabIndex = first ? 0 : -1;
        mark.setAttribute("role", "button");
        mark.setAttribute("aria-haspopup", "dialog");
        mark.setAttribute("aria-label", `${annotation.selectedText}، اضغط لإظهار الترجمة والإجراءات`);
        mark.append(range.extractContents());
        range.insertNode(mark);
        first = false;
      }
    }
  }

  function hideVocabularySelectionAction() {
    const action = root.querySelector("[data-vocab-selection-action]");
    if (action) action.hidden = true;
    selectedVocabularyRange = null;
  }

  function hideVocabularyPopover() {
    const popover = root.querySelector("[data-vocab-popover]");
    if (popover) popover.hidden = true;
    if (popover) {
      const translation = popover.querySelector("[data-vocab-translation]");
      if (translation) translation.hidden = true;
      const form = popover.querySelector("[data-vocab-entry]");
      if (form) form.hidden = true;
    }
    activeVocabularyMark = null;
    vocabularyPopoverPinned = false;
    selectedVocabularyRange = null;
  }

  function placeVocabularyPopup(element, rect) {
    if (!element || !rect) return;
    const gap = 8;
    const width = Math.min(element.offsetWidth || 280, window.innerWidth - 24);
    const height = element.offsetHeight || 80;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const preferredTop = rect.bottom + gap + height < window.innerHeight
      ? rect.bottom + gap
      : rect.top - height - gap;
    const top = Math.max(12, Math.min(preferredTop, window.innerHeight - height - 12));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function handleChange(event) {
    const answer = event.target.closest("[data-telc-answer]");
    if (!answer) return;
    const exercise = root.querySelector("[data-exercise-key]");
    if (!exercise) return;
    const key = exercise.dataset.exerciseKey;
    state.answers[key] ||= {};
    if (answer.type === "checkbox" && !answer.checked) delete state.answers[key][answer.dataset.telcAnswer];
    else state.answers[key][answer.dataset.telcAnswer] = answer.value;
    delete state.results[key];
    saveState(state);
    updateSavedIndicator();
  }

  function handleInput(event) {
    const draft = event.target.closest("[data-telc-draft]");
    if (!draft) return;
    state.drafts[draft.dataset.telcDraft] = draft.value;
    saveState(state);
    const counter = draft.closest(".telc-editor-card")?.querySelector("[data-draft-count]");
    if (counter) {
      const words = countWords(draft.value);
      const target = Number(counter.dataset.wordTarget || 0);
      counter.textContent = `${words}/${target} Wörter · ${draft.value.length} Zeichen`;
      counter.classList.toggle("is-target-met", words >= target);
    }
    updateSavedIndicator();
  }

  async function handleClick(event) {
    if (handleVocabularyClick(event)) return;

    if (event.target.closest("[data-telc-reload]")) {
      dataCache.clear();
      await render(activeRoute);
      return;
    }

    const evidenceButton = event.target.closest("[data-telc-evidence-toggle]");
    if (evidenceButton) {
      const passage = evidenceButton.closest("[data-vocabulary-passage]")
        || evidenceButton.closest("article, .telc-reading-paper")?.querySelector("[data-vocabulary-passage]");
      if (!passage) return;
      const visible = passage.classList.toggle("is-evidence-visible");
      evidenceButton.classList.toggle("is-active", visible);
      evidenceButton.setAttribute("aria-pressed", String(visible));
      evidenceButton.setAttribute("aria-label", visible ? "Schlüsselwörter ausblenden" : "Schlüsselwörter anzeigen");
      evidenceButton.title = visible ? "Schlüsselwörter ausblenden" : "Schlüsselwörter anzeigen";
      evidenceButton.querySelector("span").textContent = visible ? "إخفاء الكلمات المفتاحية" : "إظهار الكلمات المفتاحية";
      return;
    }

    const translationButton = event.target.closest("[data-telc-translate-passage]");
    if (translationButton) {
      await translatePassageToArabic(translationButton);
      return;
    }

    const questionEvidenceButton = event.target.closest("[data-telc-question-evidence]");
    if (questionEvidenceButton) {
      const panel = questionEvidenceButton.closest("fieldset")?.querySelector("[data-telc-question-evidence-panel]");
      if (!panel) return;
      const visible = panel.hidden;
      panel.hidden = !visible;
      questionEvidenceButton.classList.toggle("is-active", visible);
      questionEvidenceButton.setAttribute("aria-expanded", String(visible));
      questionEvidenceButton.querySelector("span").textContent = visible ? "إخفاء الدليل" : "إظهار الدليل";
      return;
    }

    const matchEvidenceButton = event.target.closest("[data-telc-match-evidence]");
    if (matchEvidenceButton) {
      const workspace = matchEvidenceButton.closest(".telc-workspace");
      const target = workspace?.querySelector(`[data-telc-evidence-id="${CSS.escape(matchEvidenceButton.dataset.telcMatchEvidence)}"]`);
      const noMatch = matchEvidenceButton.dataset.telcNoMatch === "true";
      const active = matchEvidenceButton.classList.toggle("is-active");
      workspace?.querySelectorAll("[data-telc-evidence-id].is-evidence-target").forEach((item) => item.classList.remove("is-evidence-target"));
      workspace?.querySelectorAll("[data-telc-no-match-note]").forEach((item) => { item.hidden = true; });
      if (active && target) {
        target.classList.add("is-evidence-target");
        target.open = true;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (active && noMatch) {
        const note = matchEvidenceButton.parentElement.querySelector("[data-telc-no-match-note]");
        if (note) note.hidden = false;
      }
      matchEvidenceButton.setAttribute("aria-pressed", String(active));
      return;
    }

    const gapEvidenceButton = event.target.closest("[data-telc-gap-evidence]");
    if (gapEvidenceButton) {
      const paper = gapEvidenceButton.closest(".telc-gap-paper");
      if (!paper) return;
      const visible = paper.classList.toggle("is-gap-evidence-visible");
      gapEvidenceButton.classList.toggle("is-active", visible);
      gapEvidenceButton.setAttribute("aria-pressed", String(visible));
      gapEvidenceButton.querySelector("span").textContent = visible ? "Lösungen ausblenden" : "Lösungen anzeigen";
      return;
    }

    const writingTimerStart = event.target.closest("[data-writing-timer-start]");
    if (writingTimerStart) {
      const key = writingTimerStart.dataset.writingTimerStart;
      if (!state.writingTimers[key]) state.writingTimers[key] = { startedAt: Date.now(), durationSeconds: 30 * 60 };
      saveState(state);
      updateWritingTimers();
      return;
    }

    const writingTimerReset = event.target.closest("[data-writing-timer-reset]");
    if (writingTimerReset) {
      delete state.writingTimers[writingTimerReset.dataset.writingTimerReset];
      saveState(state);
      updateWritingTimers();
      return;
    }

    const characterButton = event.target.closest("[data-telc-character]");
    if (characterButton) {
      insertDraftCharacter(characterButton);
      return;
    }

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

  async function translatePassageToArabic(button) {
    const passage = button.closest("[data-vocabulary-passage]")
      || button.closest(".telc-prompt-card")?.querySelector("[data-vocabulary-passage]")
      || button.closest("article, .telc-reading-paper, .telc-situation-card")?.querySelector("[data-vocabulary-passage]");
    const panel = passage?.querySelector("[data-telc-arabic-translation]");
    const content = passage?.querySelector(".telc-evidence-content");
    if (!passage || !panel || !content) return;

    const scrollToTranslation = () => {
      if (!panel.hidden) {
        requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }));
      }
    };

    if (panel.dataset.translated === "true") {
      panel.hidden = !panel.hidden;
      button.classList.toggle("is-active", !panel.hidden);
      button.setAttribute("aria-pressed", String(!panel.hidden));
      scrollToTranslation();
      return;
    }
    if (!globalThis.Translator?.create) {
      panel.textContent = "الترجمة العربية على الجهاز غير متاحة في هذا المتصفح.";
      panel.hidden = false;
      button.classList.add("is-active");
      scrollToTranslation();
      return;
    }
    button.disabled = true;
    panel.textContent = "جارٍ إعداد الترجمة العربية…";
    panel.hidden = false;
    scrollToTranslation();
    try {
      const withTimeout = (promise, message) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 4000)),
      ]);
      const translator = await withTimeout(
        globalThis.Translator.create({ sourceLanguage: "de", targetLanguage: "ar" }),
        "translator-timeout",
      );
      panel.textContent = await withTimeout(
        translator.translate(content.textContent.trim()),
        "translation-timeout",
      );
      panel.dataset.translated = "true";
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
    } catch {
      panel.textContent = "تعذر إنشاء الترجمة العربية على هذا الجهاز.";
    } finally {
      button.disabled = false;
    }
  }

  function handleDocumentClick(event) {
    if (!root.contains(event.target) || !event.target.closest("[data-telc-custom-select]")) closeCustomSelects();
    const popover = root.querySelector("[data-vocab-popover]");
    if (
      popover?.hidden
      || popover?.contains(event.target)
      || event.target.closest?.("[data-vocabulary-mark], [data-vocab-selection-action]")
    ) return;
    hideVocabularyPopover();
  }

  function handleHeaderMenuClick(event) {
    const toggle = event.target.closest?.("[data-telc-menu-toggle]");
    if (toggle) {
      setHeaderMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
      return;
    }

    if (!headerRoot?.contains(event.target)) {
      setHeaderMenuOpen(false);
      return;
    }

    if (event.target.closest?.(".telc-header-nav__menu a")) setHeaderMenuOpen(false);
  }

  function handleHeaderMenuKeydown(event) {
    if (event.key !== "Escape" || !headerRoot?.querySelector('[data-telc-menu-toggle][aria-expanded="true"]')) return;
    setHeaderMenuOpen(false);
    headerRoot.querySelector("[data-telc-menu-toggle]")?.focus();
  }

  function setHeaderMenuOpen(open) {
    const toggle = headerRoot?.querySelector("[data-telc-menu-toggle]");
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل");
    headerRoot.classList.toggle("is-menu-open", open);
  }

  function handleKeydown(event) {
    const vocabularyMark = event.target.closest("[data-vocabulary-mark]");
    if (vocabularyMark && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openVocabularyPopover(vocabularyMark, true);
      return;
    }
    if (event.key === "Escape" && !root.querySelector("[data-vocab-popover]")?.hidden) {
      event.preventDefault();
      const markId = activeVocabularyMark;
      hideVocabularyPopover();
      [...root.querySelectorAll("[data-vocabulary-mark]")].find((mark) => mark.dataset.vocabularyMark === markId)?.focus();
      return;
    }

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

    const trigger = select.querySelector("[data-telc-select-trigger]");
    [...root.querySelectorAll("[data-telc-custom-select]")].filter((item) => item.dataset.question === question).forEach((matchingSelect) => {
      const selectedOption = [...matchingSelect.querySelectorAll("[data-telc-select-option]")].find((item) => item.dataset.value === value);
      matchingSelect.querySelectorAll("[data-telc-select-option]").forEach((item) => {
        const selected = item.dataset.value === value;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      const matchingTrigger = matchingSelect.querySelector("[data-telc-select-trigger]");
      const label = matchingTrigger?.querySelector("[data-telc-select-label]");
      if (label && selectedOption) label.textContent = selectedOption.dataset.display;
      matchingTrigger?.classList.add("has-value");
    });
    closeCustomSelects();
    trigger?.focus();
    updateSavedIndicator();
  }

  function insertDraftCharacter(button) {
    const editor = button.closest(".telc-editor-card")?.querySelector("[data-telc-draft]");
    if (!editor) return;
    const character = button.dataset.telcCharacter || "";
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? start;
    editor.setRangeText(character, start, end, "end");
    editor.focus();
    editor.dispatchEvent(new Event("input", { bubbles: true }));
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
    headerRoot.classList.remove("is-menu-open");
    const level = route.level;
    const session = level ? state.simulations[level] : null;
    const showTimer = session && (route.area === "simulation" || isSimulationExercise(route, session));
    const links = [
      '<a href="#/level/A1">منصة التعلّم</a>',
      level && route.area ? `<a href="#/telc/${level}">لوحة ${level}</a>` : "",
      level && level !== "C1" ? `<a href="#/telc/${level}/simulation" class="telc-header-nav__simulation">محاكاة${showTimer ? ' · <time data-simulation-timer></time>' : ""}</a>` : "",
      level ? `<a href="#/telc/${level}/results">النتائج</a>` : "",
      level ? '<a href="#/telc">تغيير المستوى</a>' : "",
    ].join("");
    headerRoot.innerHTML = `<button class="telc-header-nav__toggle" type="button" data-telc-menu-toggle aria-expanded="false" aria-controls="telcHeaderMenu" aria-label="فتح قائمة التنقل"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><div class="telc-header-nav__menu" id="telcHeaderMenu">${links}</div>`;
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

  function updateWritingTimers() {
    root.querySelectorAll("[data-writing-timer]").forEach((timer) => {
      const key = timer.dataset.writingTimer;
      const session = state.writingTimers[key];
      const startButton = timer.parentElement.querySelector("[data-writing-timer-start]");
      if (!session) {
        timer.textContent = "30:00";
        if (startButton) startButton.disabled = false;
        return;
      }
      const remaining = Math.max(0, session.durationSeconds - Math.floor((Date.now() - session.startedAt) / 1000));
      timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
      timer.classList.toggle("is-expired", remaining === 0);
      if (startButton) startButton.disabled = true;
    });
  }

  window.setInterval(() => {
    updateSimulationTimers();
    updateWritingTimers();
  }, 1000);

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
    dataCache.set(level, (async () => {
      const response = await fetchWithTimeout(`./src/data/telc/${level.toLowerCase()}.json`);
      if (!response.ok) throw new Error(`Unable to load TELC ${level} data`);
      const data = await response.json();
      if (level === "C1") {
        try {
          const localResponse = await fetchWithTimeout("./src/data/telc/c1-local.json", 15000);
          if (localResponse.ok) {
            const local = await localResponse.json();
            // Keep the complete published catalog and replace only entries that
            // have a verified local payload.  The old spread replaced an entire
            // C1 section with the one imported exercise, which made the totals
            // and navigation misleading.
            for (const [module, localItems] of Object.entries(local.modules || {})) {
              // The source catalog currently publishes 18 Sprachbausteine exercises.
              // Two older entries (m8/m9) are still present in the imported archive,
              // which caused the duplicate dashboard cards the user reported.
              const publishedSprachbausteineKeys = new Set([
                "c1_sprachbausteine_s4_m15", "c1_sprachbausteine_s4_m16",
                "c1_sprachbausteine_s4_m18", "c1_sprachbausteine_s4_m19",
                "c1_sprachbausteine_s4_m20", "c1_sprachbausteine_s4_m21",
                "c1_sprachbausteine_s4_m23", "c1_sprachbausteine_s4_m31",
                "c1_sprachbausteine_s4_m32", "c1_sprachbausteine_s4_m34",
                "c1_sprachbausteine_s4_m35", "c1_sprachbausteine_s4_m37",
                "c1_sprachbausteine_s4_m39", "c1_sprachbausteine_s4_m41",
                "c1_sprachbausteine_p87_sb_01", "c1_sprachbausteine_p87_sb_02",
                "c1_sprachbausteine_p87_sb_10", "c1_sprachbausteine_p87_sb_09",
              ]);
              const filteredLocalItems = module === "sprachbausteineTeil1"
                ? localItems.filter((item) => publishedSprachbausteineKeys.has(item.key || item.id))
                : localItems;
              const existing = (data.modules[module] || []).filter((item) => (
                module !== "sprachbausteineTeil1"
                || publishedSprachbausteineKeys.has(item.key || item.id)
              ));
              filteredLocalItems.forEach((item) => { item.localAvailable = true; item.externalUrl = ""; });
              // Merge by the stable exercise key so a local payload replaces its
              // catalog placeholder exactly once. This keeps every Teil/section
              // in navigation without duplicate Aufgaben cards.
              const merged = new Map(existing.map((item) => [item.key || item.id, item]));
              filteredLocalItems.forEach((item) => merged.set(item.key || item.id, item));
              data.modules[module] = [...merged.values()];
            }
            for (const [module, items] of Object.entries(data.modules)) {
              for (const item of items) {
                const complete = module === "lesenTeil1"
                  ? Boolean(item.blocks)
                  : module === "lesenTeil2"
                    ? Boolean(item.text && item.questions?.length)
                    : module === "lesenTeil3"
                      ? Boolean(item.text && item.situations?.length)
                      : module === "sprachbausteineTeil1"
                        ? Boolean((item.briefText || item.text) && item.items?.length)
                        : module.startsWith("hoeren")
                          ? Boolean(item.sourceModel || item.items?.length)
                          : module === "schreiben"
                            ? Boolean(item.situation && item.punkte?.length)
                            : true;
                item.localAvailable = Boolean(item.localAvailable && complete);
                if (!complete) item.externalUrl = "local-missing";
              }
            }
          }
        } catch (error) {
          console.warn("C1 local payload could not be loaded; using the catalog fallback.", error);
        }
      }
      return data;
    })());
  }
  return dataCache.get(level);
}

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
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
      writingTimers: saved?.writingTimers || {},
      vocabulary: saved?.vocabulary && typeof saved.vocabulary === "object" && !Array.isArray(saved.vocabulary) ? saved.vocabulary : {},
    };
  } catch {
    return { answers: {}, drafts: {}, results: {}, completed: {}, simulations: {}, writingTimers: {}, vocabulary: {} };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderLevelSelector(b1, b2, c1, state) {
  return `<div class="telc-shell telc-selector">
    <header class="telc-hero">
      <span class="telc-kicker">Prüfungsstudio · استوديو الامتحانات</span>
      <h1>اختر مستوى امتحانك</h1>
      <p>تدرّب على بنية امتحان TELC الحقيقية، واحفظ إجاباتك وتقدمك تلقائيًا على هذا الجهاز.</p>
    </header>
    <div class="telc-level-grid">
      ${levelCard("B1", b1, state, "lime")}
      ${levelCard("B2", b2, state, "violet")}
      ${levelCard("C1", c1, state, "cyan")}
    </div>
  </div>`;
}

function levelCard(level, data, state, accent) {
  const stats = levelStats(level, data, state);
  return `<a class="telc-level-card" data-accent="${accent}" href="#/telc/${level}" aria-label="فتح تدريب TELC ${level}">
    <div class="telc-level-card__head"><span class="telc-level-mark">${level}</span><span>${stats.completed}/${stats.total} مكتمل</span></div>
    <h2>TELC ${level}</h2>
    <p>Niveau ${level} · تدريب متكامل على أقسام الامتحان</p>
    <div class="telc-metric-row"><span><strong>${stats.total}</strong> مجموعة تدريب</span><span><strong>${Object.keys(data.areaModules || AREA_META).length}</strong> مهارات</span><span><strong>${stats.percent}%</strong> تقدم</span></div>
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
      ${Object.entries(AREA_META).filter(([key]) => modulesForArea(level, key, data).length).map(([key, area]) => areaCard(level, key, area, data, state)).join("")}
      ${renderSimulationCard(level, data, state)}
    </section>
  </div>`;
}

function renderSimulationCard(level, data, state) {
  if (level === "C1") {
    const total = Object.values(data.modules).reduce((sum, items) => sum + items.reduce((count, item) => count + (item.count || 1), 0), 0);
    const local = Object.values(data.modules).reduce((sum, items) => sum + items.filter((item) => item.localAvailable).length, 0);
    return `<section class="telc-simulation-card telc-catalog-card telc-simulation-card--c1"><div class="telc-simulation-card__copy"><span class="telc-kicker">C1 · ÜBERSICHT</span><h2>فهرس C1 الكامل</h2><p>تظهر هنا كل التمارين المنشورة. التمارين المتاحة محليًا تفتح داخل التطبيق، أما البطاقات غير المستوردة فتظهر معلّمة بوضوح بدل التعليق أو التحويل إلى موقع خارجي.</p></div><div class="telc-simulation-card__status"><strong>${local}/${total}</strong><span>تمرينًا متاحًا محليًا</span></div></section>`;
  }
  const session = state.simulations[level];
  const moduleCount = Object.keys(data.modules).length;
  const completed = session?.completed?.length || 0;
  return `<section class="telc-simulation-card telc-simulation-card--${level.toLowerCase()}" data-simulation-level="${level}">
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
    <section class="telc-result-breakdown">${Object.entries(AREA_META).filter(([areaKey]) => modulesForArea(level, areaKey, data).length).map(([areaKey, area]) => {
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
  const modules = modulesForArea(level, key, data);
  const keys = modules.flatMap((module) => (data.modules[module] || []).flatMap((item) => Array.from({ length: item.count || 1 }, (_, index) => exerciseKey(level, module, { ...item, key: `${item.key}:${index}` }))));
  const completed = keys.filter((itemKey) => state.completed[itemKey]).length;
  return `<a class="telc-area-card telc-area-card--${key}" data-accent="${area.accent}" href="#/telc/${level}/${key}">
    <div class="telc-area-card__top"><span class="telc-area-index">${String(Object.keys(AREA_META).indexOf(key) + 1).padStart(2, "0")}</span><span>${completed}/${keys.length}</span></div>
    <h2>${area.label}</h2><strong>${area.de}</strong><p>${area.description}</p>
    <div class="telc-area-card__footer"><span>${keys.length} مجموعة</span><span aria-hidden="true">←</span></div>
  </a>`;
}

function renderLibrary(level, areaKey, data, state, selectedModule) {
  const area = AREA_META[areaKey];
  const availableModules = modulesForArea(level, areaKey, data);
  const modules = selectedModule && availableModules.includes(selectedModule) ? [selectedModule] : availableModules;
  const totalCount = modules.reduce((sum, module) => sum + (data.modules[module] || []).reduce((count, item) => count + (item.count || 1), 0), 0);
  const moduleCount = (module) => (data.modules[module] || []).reduce((count, item) => count + (item.count || 1), 0);
  return `<div class="telc-shell">
    <header class="telc-library-head"><span class="telc-kicker">${area.de}</span><h1>${area.label}</h1><p>${area.description}</p></header>
    <nav class="telc-module-tabs" aria-label="أجزاء ${area.de}">
      <a class="${selectedModule ? "" : "is-active"}" href="#/telc/${level}/${areaKey}">الكل <span class="telc-module-tab__count">${totalCount}</span></a>
      ${availableModules.map((module) => `<a class="${selectedModule === module ? "is-active" : ""}" href="#/telc/${level}/${areaKey}/${module}">${MODULE_LABELS[module]} <span class="telc-module-tab__count">${moduleCount(module)}</span></a>`).join("")}
    </nav>
    ${modules.map((module) => exerciseSection(level, areaKey, module, data.modules[module] || [], state)).join("")}
  </div>`;
}

function exerciseSection(level, areaKey, module, items, state) {
  const catalogCount = items.reduce((sum, item) => sum + (item.count || 1), 0);
  return `<section class="telc-exercise-section"><div class="telc-section-heading"><div><span>Prüfungsteil</span><h2>${MODULE_LABELS[module]}</h2></div><strong>${catalogCount} مجموعة</strong></div>
    <div class="telc-exercise-grid">${items.map((item, index) => {
    if (item.externalUrl) {
      return `<div class="telc-exercise-card telc-exercise-card--unavailable" aria-label="${escapeAttribute(exerciseTitle(item))}"><div class="telc-exercise-card__content"><h3>${escapeHtml(exerciseTitle(item))}</h3><p>${escapeHtml(item.description || "تمرين منشور — سيتم استيراد محتواه المحلي")}</p></div><div class="telc-exercise-card__meta"><span class="telc-exercise-number">${String(index + 1).padStart(2, "0")}</span><span class="telc-exercise-status">المحتوى المحلي قيد الإضافة</span></div></div>`;
    }
    const key = exerciseKey(level, module, item);
    const result = state.results[key];
    const complete = Boolean(state.completed[key]);
    return `<a class="telc-exercise-card ${complete ? "is-complete" : ""}" href="#/telc/${level}/${areaKey}/${module}/${index}">
        <div class="telc-exercise-card__content"><h3>${escapeHtml(exerciseTitle(item))}</h3><p>${exerciseSubtitle(module, item)}</p></div>
        <div class="telc-exercise-card__meta"><span class="telc-exercise-number">${String(index + 1).padStart(2, "0")}</span><span class="telc-exercise-status">${result ? `${result.score}/${result.total}` : complete ? "مكتمل" : "ابدأ"}</span></div>
      </a>`;
  }).join("")}</div></section>`;
}

function renderExercise(level, areaKey, module, index, item, total, state) {
  const key = exerciseKey(level, module, item);
  const expected = expectedAnswers(module, item);
  const saved = state.answers[key] || {};
  const result = state.results[key];
  const complete = Boolean(state.completed[key]);
  const body = renderExerciseBody(level, module, item, key, saved, result, state.drafts[key] || "");
  const previous = index > 0 ? `#/telc/${level}/${areaKey}/${module}/${index - 1}` : null;
  const next = index + 1 < total ? `#/telc/${level}/${areaKey}/${module}/${index + 1}` : `#/telc/${level}/${areaKey}/${module}`;

  const vocabularyControls = areaKey === "lesen" ? renderVocabularyControls() : "";
  return `<div class="telc-shell telc-exam-shell" data-exercise-key="${escapeAttribute(key)}" data-expected="${escapeAttribute(JSON.stringify(expected))}" ${areaKey === "lesen" ? "data-vocabulary-enabled" : ""}>
    <header class="telc-exam-head"><div><span class="telc-kicker">${MODULE_LABELS[module]} · ${index + 1}/${total}</span><h1>${escapeHtml(exerciseTitle(item))}</h1></div><span data-saved-indicator>يُحفظ تلقائيًا</span></header>
    ${result ? `<div class="telc-result ${result.percent >= 60 ? "is-pass" : "is-review"}"><strong>${result.score}/${result.total}</strong><span>${result.percent >= 60 ? "أحسنت — نتيجة ناجحة" : "راجع الإجابات وحاول مجددًا"}</span><em>${result.percent}%</em></div>` : ""}
    ${body}
    ${vocabularyControls}
    <div class="telc-exam-actions-wrap">
      <footer class="telc-exam-actions">
        <div><a class="telc-secondary-link" href="#/telc/${level}/${areaKey}/${module}"><span class="telc-action-label">العودة للقائمة</span><span class="telc-action-icon" aria-hidden="true">☷</span></a>${previous ? `<a class="telc-secondary-link" href="${previous}"><span class="telc-action-label">السابق</span><span class="telc-action-icon" aria-hidden="true">←</span></a>` : ""}<a class="telc-secondary-link" href="${next}"><span class="telc-action-label">التالي</span><span class="telc-action-icon" aria-hidden="true">→</span></a></div>
        <div><button class="telc-quiet-button" type="button" data-telc-reset="${escapeAttribute(key)}"><span class="telc-action-label">إعادة الضبط</span><span class="telc-action-icon" aria-hidden="true">↻</span></button><button class="telc-submit-button" type="button" data-telc-${expected ? "submit" : "complete"}="${escapeAttribute(key)}"><span class="telc-action-label">${expected ? "تصحيح الإجابات" : complete ? "تم الإنجاز ✓" : "حفظ كمنجز"}</span><span class="telc-action-icon" aria-hidden="true">✓</span></button></div>
      </footer>
    </div>
  </div>`;
}

function renderVocabularyControls() {
  return `<div class="telc-vocab-selection-action" data-vocab-selection-action hidden>
      <button type="button" data-vocab-mark-selection>Markiere das Wort</button>
    </div>
    <section class="telc-vocab-popover" data-vocab-popover role="dialog" aria-label="مفردات النص" hidden>
      <p class="telc-vocab-selected" data-vocab-selected hidden><bdi data-vocab-selected-text dir="auto"></bdi></p>
      <div class="telc-vocab-translation" data-vocab-translation-container hidden>
        <span>المعنى المحفوظ</span><bdi data-vocab-translation dir="auto" hidden></bdi>
      </div>
      <div class="telc-vocab-actions" data-vocab-annotation-actions hidden>
        <button type="button" data-vocab-show-translation>إظهار الترجمة</button>
        <button type="button" data-vocab-edit>تعديل الترجمة</button>
        <button type="button" data-vocab-learn>تعلمتها وإزالة التحديد</button>
        <button type="button" data-vocab-close>إغلاق</button>
      </div>
      <form class="telc-vocab-entry" data-vocab-entry hidden>
        <label for="telc-vocab-translation-input">أدخل المعنى الذي تريد حفظه</label>
        <textarea id="telc-vocab-translation-input" data-vocab-translation-input rows="3" dir="auto"></textarea>
        <div><button type="button" data-vocab-cancel-entry>إلغاء</button><button type="button" data-vocab-save>حفظ</button></div>
      </form>
    </section>`;
}

function renderVocabularyPassage(text, passageId) {
  const hasEvidence = /\*\*.+?\*\*/s.test(String(text ?? ""));
  return `<div class="telc-evidence-passage" data-vocabulary-passage="${escapeAttribute(passageId)}">
    <div class="telc-evidence-toolbar">${hasEvidence ? renderEvidenceIcon() : ""}${renderTranslationIcon()}</div>
    <div class="telc-evidence-content">${formatRichText(text)}</div>
    <div class="telc-arabic-translation" data-telc-arabic-translation dir="rtl" lang="ar" hidden></div>
  </div>`;
}

function renderEvidenceIcon() {
  return '<button type="button" class="telc-evidence-toggle telc-icon-tool" data-telc-evidence-toggle aria-pressed="false" aria-label="Schlüsselwörter anzeigen" title="Schlüsselwörter anzeigen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 17.7 7 20.4H3.6v-3.3l6.1-6.2a6 6 0 1 1 3.4 3.4l-1.5 1.5-1.6-1.6-1.5 1.5 1.2 2Z"/><circle cx="15.5" cy="8.5" r="1.5"/></svg><span>إظهار الكلمات المفتاحية</span></button>';
}

function renderTranslationIcon() {
  return '<button type="button" class="telc-translation-toggle telc-icon-tool" data-telc-translate-passage aria-pressed="false" aria-label="Gesamten Text ins Arabische übersetzen" title="Ins Arabische übersetzen"><svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 8L10 13M4 14L10 8L12 5M2 5H14M7 2H8M12.913 17H20.087M12.913 17L11 21M12.913 17L15.7783 11.009C16.0092 10.5263 16.1246 10.2849 16.2826 10.2086C16.4199 10.1423 16.5801 10.1423 16.7174 10.2086C16.8754 10.2849 16.9908 10.5263 17.2217 11.009L20.087 17M20.087 17L22 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>ترجمة النص إلى العربية</span></button>';
}

function renderTestInstruction(de, ar) {
  return `<details class="telc-instruction"><summary><span class="telc-instruction__de">Aufgabe</span></summary><p lang="de">${escapeHtml(de)}</p><p lang="ar" dir="rtl">${escapeHtml(ar)}</p></details>`;
}

function renderExerciseBody(level, module, item, key, saved, result, draft) {
  if (module === "lesenTeil1" && item.blocks) return renderC1GapInsertion(item, key, saved, result);
  if (level === "C1" && module === "hoerenTeil2" && item.items?.length) return renderC1ImportedSource(module, item, key, saved, result);
  if (item.sourceModel) return renderC1ImportedSource(module, item, key, saved, result);
  if (module === "lesenTeil1") return renderHeadingMatch(item, key, saved, result);
  if (module === "lesenTeil2") return renderReadingChoice(item, key, saved, result);
  if (module === "lesenTeil3") return item.choices?.includes("not_stated")
    ? renderC1ReadingStatements(item, key, saved, result)
    : renderSituationMatch(item, key, saved, result);
  if (module === "sprachbausteineTeil1") return renderGapOptions(item, saved, result);
  if (module === "sprachbausteineTeil2") return renderWordBank(item, saved, result);
  if (module.startsWith("hoeren")) return renderListening(item, saved, result);
  if (module === "schreiben") return renderWriting(level, item, key, draft);
  return renderSpeaking(item, key, draft);
}

function renderC1ImportedSource(module, item, key, saved, result) {
  if (module === "lesenTeil2") return renderReadingChoice(item, key, saved, result);
  if (module === "sprachbausteineTeil1") return renderGapOptions(item, saved, result);
  if (module === "hoerenTeil2") {
    const questions = item.items || [];
    const reviewOnly = questions.some((question) => !(question.options || []).length);
    const rows = questions.map((question, index) => {
      if (!(question.options || []).length) {
        return `<label class="telc-self-check telc-review-question"><input type="checkbox" data-telc-answer="${escapeAttribute(index)}" value="reviewed" ${saved[String(index)] ? "checked" : ""}><span class="telc-checkmark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span class="telc-self-check__text">${escapeHtml(question.text || `Aufgabe ${index + 1}`)}</span></label>`;
      }
      return radioQuestion(String(index), question.text, question.options, saved[String(index)], question.answer, result, "letter", question.options?.[String(question.answer || "").toLowerCase().charCodeAt(0) - 97] || "");
    }).join("");
    return `<div class="telc-workspace"><main class="telc-content-stack"><section class="telc-listening-intro"><span>Hörtraining · Teil 2</span><h2>${escapeHtml(exerciseTitle(item))}</h2>${reviewOnly ? `<span class="telc-source-badge is-self-study">Selbststudium · ohne Lösungsschlüssel</span>` : ""}${renderTestInstruction(reviewOnly ? "Lesen Sie die Aufgabenstämme und markieren Sie jede Aufgabe nach dem Durcharbeiten." : "Hören Sie den Text und wählen Sie bei jeder Aufgabe die passende Antwort.", reviewOnly ? "اقرأ بدايات الأسئلة، وبعد مراجعتها علّم كل مهمة كمراجعة مكتملة." : "استمع إلى التسجيل واختر الإجابة المناسبة لكل سؤال.")}</section></main><aside class="telc-question-panel"><h2>Aufgaben</h2>${rows}</aside></div>`;
  }
  if (module === "hoerenTeil1") {
    const choices = (item.statements || []).map((statement) => statement.id);
    const labels = Object.fromEntries((item.statements || []).map((statement) => [statement.id, statement.de]));
    const choiceLabels = choices.map((choice) => choice.toUpperCase());
    const statementBank = choices.length ? `<section class="telc-choice-bank"><h3>Aussagen a–j</h3>${choices.map((choice) => `<div><strong>${choice.toUpperCase()}</strong><span>${escapeHtml(labels[choice] || "")}</span></div>`).join("")}</section>` : "";
    const transcript = item.sourceModel.transcript || item.transcript || [];
    const transcriptMarkup = transcript.length ? `<details class="telc-transcript"><summary>Hörtext · إظهار نص الاستماع</summary>${transcript.map((entry) => `<p><strong>Person ${escapeHtml(entry.speaker)}</strong><br>${escapeHtml(entry.de || "")}</p>`).join("")}</details>` : "";
    return `<div class="telc-workspace"><main class="telc-content-stack"><section class="telc-listening-intro"><span>Hörtraining · Teil 1</span><h2>${escapeHtml(exerciseTitle(item))}</h2>${renderTestInstruction("Lesen Sie die Aussagen a–j. Hören Sie den Text und ordnen Sie jeder Person die passende Aussage zu.", "اقرأ العبارات من A إلى J، ثم استمع إلى التسجيل واربط كل شخص بالعبارة المناسبة.")}</section>${statementBank}${transcriptMarkup}</main><aside class="telc-question-panel"><h2>Personen</h2>${(item.sourceModel.questions || []).map((question, index) => radioQuestion(String(index), `Person ${question.speaker}`, choiceLabels, saved[String(index)], question.key, result, "letter", labels[question.key] || "")).join("")}</aside></div>`;
  }
  if (module === "hoerenTeil3") return renderListeningNotes(item, key, saved);
  if (module === "lesenTeil3") {
    const choices = ["true", "false", "not_stated"];
    return `<div class="telc-workspace"><article class="telc-reading-paper">${renderVocabularyPassage(item.text, `${key}:text`)}</article><aside class="telc-question-panel"><h2>Aufgaben</h2>${(item.situations || []).map((question, index) => { const expected = question.answer === "true" ? "a" : question.answer === "false" ? "b" : "c"; return radioQuestion(String(index), question.text, choices.map((value) => value === "true" ? "Richtig" : value === "false" ? "Falsch" : "Nicht im Text"), saved[String(index)], expected, result, "letter"); }).join("")}</aside></div>`;
  }
  return renderListening(item, saved, result);
}

function renderC1ReadingStatements(item, key, saved, result) {
  const choices = ["Richtig", "Falsch", "Nicht im Text"];
  const expectedFor = (answer) => answer === "true" ? "a" : answer === "false" ? "b" : "c";
  return `<div class="telc-workspace"><main class="telc-content-stack">${renderTestInstruction("Lesen Sie den Text und entscheiden Sie bei jeder Aussage: richtig, falsch oder nicht im Text.", "اقرأ النص وحدد لكل عبارة: صحيح أم خطأ أم أنها غير مذكورة في النص.")}<article class="telc-reading-paper">${renderVocabularyPassage(item.text, `${key}:text`)}</article></main><aside class="telc-question-panel"><h2>Aussagen</h2>${(item.situations || []).map((situation, index) => radioQuestion(String(index), situation.text, choices, saved[String(index)], expectedFor(situation.answer), result, "letter")).join("")}</aside></div>`;
}

function renderListeningNotes(item, key, saved) {
  const source = item.sourceModel || {};
  const questions = new Map((source.questions || []).map((question) => [String(question.n), question]));
  const groups = source.groups || [];
  const renderNoteRow = (entry) => {
    const question = questions.get(String(entry.n));
    if (!question) return "";
    const fallbackPrompt = `Lücke ${entry.n}`;
    const prompt = question.prompt?.de || item.items?.find((candidate) => String(candidate.id) === String(entry.n))?.text || fallbackPrompt;
    const answer = question.a?.de || item.items?.find((candidate) => String(candidate.id) === String(entry.n))?.answer || "";
    const value = saved[String(entry.n)] || "";
    const promptText = prompt === fallbackPrompt ? "" : prompt;
    return `<div class="telc-note-row"><label for="telc-note-${escapeAttribute(entry.n)}"><strong>Lücke ${escapeHtml(entry.n)}</strong>${promptText ? `<span>${escapeHtml(promptText)}</span>` : ""}</label><input id="telc-note-${escapeAttribute(entry.n)}" class="telc-note-input" type="text" data-telc-answer="${escapeAttribute(entry.n)}" value="${escapeAttribute(value)}" autocomplete="off"><details class="telc-note-answer"><summary>Antwort anzeigen</summary><p>${escapeHtml(answer)}</p></details></div>`;
  };
  const audio = item.audioUrl ? `<audio class="telc-listening-audio" controls preload="none" src="${escapeAttribute(item.audioUrl)}"><a href="${escapeAttribute(item.audioUrl)}">Audio abspielen</a></audio>` : "";
  return `<div class="telc-workspace"><main class="telc-content-stack"><section class="telc-listening-intro"><span>Hörtraining · Teil 3</span><h2>${escapeHtml(exerciseTitle(item))}</h2><span class="telc-source-badge is-audio-only">Audio verfügbar · Lösungsschlüssel nicht verifiziert</span>${renderTestInstruction("Hören Sie den Text und ergänzen Sie die Notizen. Öffnen Sie die Antwort nur zur Kontrolle.", "استمع إلى التسجيل وأكمل الملاحظات. افتح الإجابة عند الحاجة للمراجعة فقط.")}${audio}</section></main><aside class="telc-question-panel telc-note-panel"><h2>Notizen und Redemittel</h2>${groups.map((group) => `<section class="telc-note-group"><h3>${escapeHtml(group.de || "Weitere Angaben")}</h3>${(group.sequence || []).filter((entry) => entry.kind === "gap").map(renderNoteRow).join("")}</section>`).join("")}</aside></div>`;
}

function renderC1GapInsertion(item, key, saved, result) {
  const options = Object.fromEntries(item.options.filter((option) => !option.exampleOnly).map((option) => [option.id, option.text.de]));
  const renderPart = (part) => part?.type === "gap"
    ? `<span class="telc-c1-gap-slot">${part.id === 0 ? "Beispiel" : selectControl(String(part.id), Object.keys(options), saved[String(part.id)], "Lücke", options)}</span>`
    : `<span>${escapeHtml(typeof part?.text === "object" ? part.text.de : part?.text || "")} </span>`;
  const text = (item.blocks || []).map((block) => {
    if (block.kind === "rich") return (block.parts || []).map(renderPart).join("");
    return block.kind === "gap" ? renderPart(block) : renderPart({ type: "text", text: block.text });
  }).join("");
  const instruction = item.instructions?.de?.body || item.instructions?.de || "Lesen Sie den folgenden Text und ergänzen Sie die Lücken.";
  return `<article class="telc-reading-paper telc-c1-reading-paper">${renderTestInstruction(instruction, "اقرأ النص واختر الجمل المناسبة للفراغات. لكل فراغ إجابة صحيحة واحدة فقط.")}<div class="telc-gap-paper__intro"><span>C1 · Leseverstehen · Teil 1</span>${renderTranslationIcon()}</div><h2>${escapeHtml(item.title?.de || item.title || "")}</h2><div class="telc-c1-reading-text" data-vocabulary-passage="${escapeAttribute(`${key}:passage`)}"><div class="telc-evidence-content">${text}</div><div class="telc-arabic-translation" data-telc-arabic-translation dir="rtl" lang="ar" hidden></div></div><aside class="telc-c1-option-bank"><h3>Sätze a–h</h3>${Object.entries(options).map(([id, label]) => `<div><strong>${id.toUpperCase()}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</aside></article>`;
}

function renderHeadingMatch(item, key, saved, result) {
  const letters = item.headings.map((_, index) => String.fromCharCode(97 + index));
  const headingLabels = Object.fromEntries(letters.map((letter, index) => [letter, item.headings[index]]));
  return `<div class="telc-workspace"><main class="telc-content-stack">${item.texte.map((text, index) => {
    const question = String(index);
    const correctHeading = item.headings[letters.indexOf(String(item.answers[index]).toLowerCase())] || "";
    const explicitEvidence = HEADING_EVIDENCE_OVERRIDES[item.key]?.[index] || [];
    const enrichedText = withExplicitKeywords(
      withHeadingEvidence(text, correctHeading, explicitEvidence),
      item.textKeywords?.[index] || [],
    );
    return `<article class="telc-text-card ${feedbackClass(result, saved[question], item.answers[index])}"><div class="telc-text-card__answer"><span>Text ${index + 1}</span><div class="telc-inline-tools">${renderEvidenceIcon()}${renderTranslationIcon()}</div>${selectControl(question, letters, saved[question], "اختر العنوان", headingLabels)}</div><div class="telc-evidence-passage" data-vocabulary-passage="${escapeAttribute(`${key}:text:${index}`)}"><div class="telc-evidence-content">${formatRichText(enrichedText)}</div><div class="telc-arabic-translation" data-telc-arabic-translation dir="rtl" lang="ar" hidden></div></div></article>`;
  }).join("")}</main><aside class="telc-reference-panel"><h2>Überschriften</h2>${item.headings.map((heading, index) => `<div class="telc-heading-option"><strong>${letters[index].toUpperCase()}</strong><span>${inlineRichText(heading)}</span></div>`).join("")}</aside></div>`;
}

const EVIDENCE_STOP_WORDS = new Set("aber alle allem allen aller alles auch beim bereits damit dann dass deine einem einen einer eines für haben ihre ihren ihrer ihres immer kann können macht mehr neue neuen neuer neues nicht noch oder ohne sehr sein seine seit sich sind sowie über unter vom von vor wenn werden wird wurde zum zur zwischen".split(" "));

const HEADING_EVIDENCE_OVERRIDES = {
  lv1_spiele: [["Plüschtiere einzeln angefertigt"], [], ["in die Hand nehmen"], ["Beim gemeinsamen Spiel"]],
  lv1_familie: [[], ["Schwarze Schafe"], [], ["richtigen Partner", "zu finden"]],
  lv1_umwelt: [["Tauschen, nicht wegwerfen"]],
  lv1_bonbon: [["Geschichte reicht weit zurück"], ["abgelaufenen", "günstiger angeboten"], ["römischen Thermen"], ["kaum einen positiven Einfluss auf die Laune"], ["123 Thermalquellen"]],
  lv1_wahlen: [["höchste Abschluss, den eine Frau"], [], ["Wahlverhalten von Frauen"], ["Weibliche Studierende", "Studium schneller"]],
  lv1_rauchen: [[], [], [], ["Sport im Hochgebirge"]],
  lv1_tanzkurs: [["Extremsport"], [], [], ["Hip-Hop-Tanzgruppe"], ["Terminkalender"]],
  lv1_pferde: [["auf Pferden"], ["Weltmeisterschaften oder Olympischen Spielen"], ["Rentenalter"], ["Gewichtsabnahme"]],
  lv1_benzin: [[], [], ["Pilotin"], [], ["Flugreisen"]],
  lv1_nase: [["plastische Chirurg"]],
  lv1_jugend: [[], [], [], [], ["Mobbing"]],
  lv1_handwerk: [[], ["Altstadt", "Fachwerkhäuser"], ["zum Internat umfunktioniert"], ["Museen", "alte Feuerwehrwagen"], ["vor fast 900 Jahren", "Kaffee"]],
  lv1_foto: [["nächtliche Finsternis"]],
  lv1_wetter_sturm: [["Namen von Stürmen"]],
  lv1_loewen: [[], ["südafrikanische Regierung gehandelt"]],
  lv1_babytv: [["Sprachentwicklung bei Kleinkindern nicht förderlich"], [], [], ["Schwestern"]],
};

function withHeadingEvidence(text, heading, explicitEvidence = []) {
  const source = String(text ?? "");
  if (/\*\*.+?\*\*/s.test(source)) return source;
  if (explicitEvidence.length) {
    return explicitEvidence.reduce((result, phrase) => result.replace(
      new RegExp(`(${escapeRegExp(phrase)})`, "iu"),
      "**$1**",
    ), source);
  }
  const headingWords = stripFormatting(heading).toLocaleLowerCase("de-DE").match(/[a-zäöüß]{5,}/gu) || [];
  const sourceWords = source.match(/[A-Za-zÄÖÜäöüß]{5,}/gu) || [];
  const candidates = [...new Set(headingWords)]
    .filter((word) => !EVIDENCE_STOP_WORDS.has(word))
    .map((word) => sourceWords.find((sourceWord) => {
      const normalized = sourceWord.toLocaleLowerCase("de-DE");
      return normalized === word || (word.length >= 7 && normalized.length >= 7 && normalized.slice(0, 6) === word.slice(0, 6));
    }))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .slice(0, 3);
  return candidates.reduce((result, word) => result.replace(
    new RegExp(`(^|[^\\p{L}])(${escapeRegExp(word)})(?=$|[^\\p{L}])`, "iu"),
    "$1**$2**",
  ), source);
}

function withExplicitKeywords(text, keywords = []) {
  let parts = String(text ?? "").split(/(\*\*.*?\*\*)/gs);
  [...new Set(keywords.filter(Boolean))]
    .sort((left, right) => right.length - left.length)
    .forEach((phrase) => {
      const expression = new RegExp(`(${escapeRegExp(phrase)})`, "iu");
      const index = parts.findIndex((part, partIndex) => partIndex % 2 === 0 && expression.test(part));
      if (index < 0) return;
      parts[index] = parts[index].replace(expression, "**$1**");
      parts = parts.flatMap((part) => part.split(/(\*\*.*?\*\*)/gs)).filter((part) => part !== "");
    });
  return parts.join("");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderReadingChoice(item, key, saved, result) {
  const variant = item.variants?.[0];
  const questions = item.questions || variant?.fragen || [];
  const enrichedText = withExplicitKeywords(item.text, item.textKeywords || []);
  const sections = item.paragraphs || [];
  const sectionLabels = Object.fromEntries(sections.map((section) => [String(section.label).toLowerCase(), section.de]));
  const sectionBank = sections.length ? `<section class="telc-c1-section-bank"><h2>Abschnitte a–e</h2>${sections.map((section) => `<article><strong>${escapeHtml(String(section.label).toUpperCase())}</strong><p>${escapeHtml(section.de)}</p></article>`).join("")}</section>` : "";
  return `<div class="telc-workspace"><main class="telc-content-stack">${renderTestInstruction("Lesen Sie den Text und wählen Sie für jede Aufgabe den passenden Abschnitt.", "اقرأ النص واختر لكل سؤال الفقرة المناسبة.")}<article class="telc-reading-paper">${renderVocabularyPassage(enrichedText, `${key}:text`)}</article>${sectionBank}</main><aside class="telc-question-panel"><h2>Aufgaben</h2>${questions.map((question, index) => {
    const options = question.opts || question.options || [];
    const optionLabels = sections.length
      ? options.map((option) => String(option).toUpperCase())
      : options;
    const expected = question.answer ?? question.correct;
    const correctIndex = typeof expected === "number" ? expected : String(expected).toLowerCase().charCodeAt(0) - 97;
    const evidence = optionLabels[correctIndex] || "";
    const clues = item.questionKeywords?.[index] || [];
    return radioQuestion(String(index), question.text, optionLabels, saved[String(index)], expected, result, typeof expected === "number" ? "index" : "letter", evidence, clues);
  }).join("")}</aside></div>`;
}

function renderSituationMatch(item, key, saved, result) {
  const materials = item.anzeigen || item.infotexts || {};
  const keys = Object.keys(materials);
  const answerOptions = item.situations.some((situation) => String(situation.answer).toLowerCase() === "x")
    ? [...keys, keys.some((letter) => letter === letter.toUpperCase()) ? "X" : "x"]
    : keys;
  return `<div class="telc-workspace"><main class="telc-content-stack">${item.situations.map((situation, index) => {
    const answer = String(situation.answer).toLowerCase();
    const noMatch = answer === "x" || !keys.some((letter) => letter.toLowerCase() === answer);
    return `<article class="telc-situation-card ${feedbackClass(result, saved[String(index)], situation.answer)}"><span>${situation.id ?? index + 1}</span><div>${renderVocabularyPassage(situation.text, `${key}:situation:${situation.id ?? index}`)}</div>${selectControl(String(index), answerOptions, saved[String(index)], "اختر الإعلان")}<button class="telc-match-evidence" type="button" data-telc-match-evidence="${escapeAttribute(answer)}" data-telc-no-match="${noMatch}" aria-pressed="false"><b aria-hidden="true">🔑</b><span>إظهار الإعلان المناسب</span></button>${noMatch ? '<p class="telc-no-match-note" data-telc-no-match-note hidden>Keine passende Anzeige · لا يوجد إعلان مناسب</p>' : ""}</article>`;
  }).join("")}</main><aside class="telc-reference-panel telc-reference-panel--wide"><h2>Anzeigen</h2>${keys.map((letter) => `<details data-telc-evidence-id="${escapeAttribute(letter.toLowerCase())}"><summary><strong>${letter}</strong> Anzeige ${letter}</summary>${renderVocabularyPassage(materials[letter], `${key}:ad:${letter}`)}</details>`).join("")}</aside></div>`;
}

function renderGapOptions(item, saved, result) {
  return `<article class="telc-reading-paper telc-gap-paper">${renderTestInstruction("Lesen Sie den Text und wählen Sie für jede Lücke die passende Lösung.", "اقرأ النص واختر الحل المناسب لكل فراغ.")}<div class="telc-gap-paper__intro"><span>Sprachbausteine</span><strong>اختر الإجابة مباشرة داخل النص</strong>${renderGapEvidenceButton()}</div>${formatGapText(item, saved, result)}</article>`;
}

function renderWordBank(item, saved, result) {
  const words = item.woerter || {};
  const keys = Object.keys(words);
  return `<div class="telc-workspace telc-gap-workspace"><article class="telc-reading-paper telc-gap-paper">${renderTestInstruction("Lesen Sie den Text und setzen Sie die passenden Wörter aus der Wortbank ein.", "اقرأ النص واستخدم الكلمات المناسبة من بنك الكلمات.")}<div class="telc-gap-paper__intro"><span>Sprachbausteine</span><strong>اختر الكلمة مباشرة داخل النص</strong>${renderGapEvidenceButton()}</div>${formatGapText(item, saved, result, words)}</article><aside class="telc-reference-panel"><h2>Wortbank</h2><div class="telc-word-bank">${keys.map((letter) => `<span><strong>${letter.toUpperCase()}</strong>${escapeHtml(words[letter])}</span>`).join("")}</div></aside></div>`;
}

function renderGapEvidenceButton() {
  return '<button class="telc-gap-evidence" type="button" data-telc-gap-evidence aria-pressed="false"><span>Lösungen anzeigen</span></button>';
}

function renderListening(item, saved, result) {
  const items = item.items || (item.aussagen || []).map((text, index) => ({ id: index + 1, text }));
  const listeningTitle = exerciseTitle(item);
  const hasAnswers = items.every((entry) => typeof entry.answer === "boolean");
  const audio = item.audioUrl ? `<audio class="telc-listening-audio" controls preload="none" src="${escapeAttribute(item.audioUrl)}"><a href="${escapeAttribute(item.audioUrl)}">Audio abspielen</a></audio>` : "";
  const sourceBadge = hasAnswers ? `<span class="telc-source-badge is-verified">Verifiziert</span>` : item.audioUrl ? `<span class="telc-source-badge is-audio-only">Audio verfügbar · Lösungsschlüssel nicht verifiziert</span>` : `<span class="telc-source-badge is-self-study">Selbststudium · ohne Lösungsschlüssel</span>`;
  const listeningInstruction = hasAnswers ? "اقرأ العبارات ثم استمع واختر صحيح أو خطأ." : item.audioUrl ? "استمع إلى التسجيل وراجع العبارات؛ لم يتم اعتماد مفتاح إجابة لهذه النسخة." : "هذه المجموعة مخصصة للتدريب الذاتي؛ لا توجد إجابات موثقة أو تسجيل صوتي مضمّن لهذه النسخة.";
  const germanInstruction = hasAnswers ? "Lesen Sie die Aussagen, hören Sie den Text und wählen Sie richtig oder falsch." : item.audioUrl ? "Hören Sie den Text und bearbeiten Sie die Aussagen. Der Lösungsschlüssel ist für diese Version nicht verifiziert." : "Bearbeiten Sie die Aussagen selbstständig; für diese Version gibt es keinen verifizierten Lösungsschlüssel.";
  return `<div class="telc-workspace"><main class="telc-content-stack"><section class="telc-listening-intro"><span>Hörtraining</span><h2>${escapeHtml(listeningTitle)}</h2>${sourceBadge}${renderTestInstruction(germanInstruction, listeningInstruction)}${audio}${item.code ? `<strong>Audio-Code: ${escapeHtml(item.code)}</strong>` : ""}</section>${item.hoertext ? `<details class="telc-transcript"><summary>إظهار نص الاستماع · Hörtext</summary>${formatRichText(item.hoertext)}</details>` : ""}</main><aside class="telc-question-panel"><h2>Aussagen</h2>${items.map((entry, index) => hasAnswers ? radioQuestion(String(index), entry.text, ["Richtig", "Falsch"], saved[String(index)], entry.answer, result, "boolean", entry.answer ? "Richtig" : "Falsch") : `<label class="telc-self-check"><input type="checkbox" data-telc-answer="${index}" value="reviewed" ${saved[String(index)] ? "checked" : ""}><span class="telc-checkmark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span class="telc-self-check__text">${escapeHtml(entry.text)}</span></label>`).join("")}</aside></div>`;
}

function renderWriting(level, item, key, draft) {
  const target = level === "C1" ? 350 : level === "B2" ? 150 : 80;
  const words = countWords(draft);
  const prompt = `<div class="telc-evidence-passage telc-writing-prompt" data-vocabulary-passage="${escapeAttribute(`${key}:prompt`)}"><div class="telc-evidence-content"><p>${escapeHtml(item.situation)}</p>${item.anzeige ? `<blockquote>${escapeHtml(item.anzeige)}</blockquote>` : ""}</div><div class="telc-arabic-translation" data-telc-arabic-translation dir="rtl" lang="ar" hidden></div></div>`;
  const instruction = level === "C1" ? renderTestInstruction("Schreiben Sie einen klar gegliederten Text und behandeln Sie alle vorgegebenen Inhaltspunkte.", "اكتب نصًا منظمًا وواضحًا وتناول جميع النقاط المطلوبة.") : "";
  return `<div class="telc-writing-layout"><section class="telc-prompt-card"><div class="telc-prompt-heading"><div><span>Situation</span><h2>${escapeHtml(item.title)}</h2></div>${renderTranslationIcon()}</div>${instruction}${prompt}<h3>Behandeln Sie diese Punkte:</h3><div class="telc-writing-checklist">${item.punkte.map((point, index) => `<label><input type="checkbox"><span>${index + 1}</span><b>${escapeHtml(point)}</b></label>`).join("")}</div><details class="telc-writing-guide"><summary>Redemittel und Aufbau</summary><ul><li>Anrede und passender Einstieg</li><li>Alle Inhaltspunkte logisch verbinden</li><li>Eigene Erwartung oder Bitte klar formulieren</li><li>Passender Schluss und Grußformel</li></ul></details></section><section class="telc-editor-card"><div class="telc-writing-status"><label for="telc-draft">Ihre Antwort</label><div><time data-writing-timer="${escapeAttribute(key)}">30:00</time><button class="telc-writing-timer-button" type="button" aria-label="Timer starten" title="Timer starten" data-writing-timer-start="${escapeAttribute(key)}">▶</button><button class="telc-writing-timer-button" type="button" aria-label="Timer zurücksetzen" title="Timer zurücksetzen" data-writing-timer-reset="${escapeAttribute(key)}">↻</button></div></div>${characterToolbar("telc-draft")}<textarea id="telc-draft" data-telc-draft="${escapeAttribute(key)}" placeholder="Schreiben Sie hier Ihre Antwort …">${escapeHtml(draft)}</textarea><div><span data-draft-count data-word-target="${target}" class="${words >= target ? "is-target-met" : ""}">${words}/${target} Wörter · ${draft.length} Zeichen</span><span>المسودة محفوظة تلقائيًا</span></div></section></div>`;
}

function countWords(value) {
  return (String(value).trim().match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
}

function renderSpeaking(item, key, draft) {
  const planningPoints = item.teil3s || item.teil3_stichworte || [];
  const promptText = item.mA ? `${item.mA.text || ""}\n\n${item.mB?.text || ""}` : `${item.teil2 || ""}\n\n${item.teil3 || ""}`;
  return `<div class="telc-speaking-layout"><section class="telc-prompt-card"><div class="telc-prompt-heading"><div><span>Thema</span><h2>${escapeHtml(item.titel || item.thema)}</h2></div>${renderTranslationIcon()}</div><div class="telc-evidence-passage telc-speaking-prompt" data-vocabulary-passage="${escapeAttribute(`${key}:prompt`)}"><div class="telc-evidence-content">${item.mA ? `<div class="telc-opinion-grid"><article><strong>${escapeHtml(item.mA.name)}</strong>${formatRichText(item.mA.text)}</article><article><strong>${escapeHtml(item.mB?.name || "Position B")}</strong>${formatRichText(item.mB?.text || "")}</article></div>` : item.teil2 ? `<div class="telc-speaking-text">${formatRichText(item.teil2)}</div>` : ""}</div><div class="telc-arabic-translation" data-telc-arabic-translation dir="rtl" lang="ar" hidden></div></div><h3>Gemeinsam planen</h3><p>${escapeHtml(item.teil3 || "")}</p>${planningPoints.length ? `<ul>${planningPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}</section><section class="telc-editor-card"><label for="telc-notes">Notizen und Redemittel</label>${characterToolbar("telc-notes")}<textarea id="telc-notes" data-telc-draft="${escapeAttribute(key)}" placeholder="Notieren Sie Argumente, Beispiele und Redemittel …">${escapeHtml(draft)}</textarea><div><span data-draft-count>${draft.length} Zeichen</span><span>تُحفظ ملاحظاتك تلقائيًا</span></div></section></div>`;
}

function characterToolbar(targetId) {
  return `<div class="telc-character-toolbar" role="group" aria-label="Deutsche Sonderzeichen">${["ä", "Ä", "ö", "Ö", "ü", "Ü", "ß"].map((character) => `<button type="button" data-telc-character="${character}" aria-label="${character} in das Textfeld einfügen" aria-controls="${targetId}">${character}</button>`).join("")}</div>`;
}

function formatGapText(item, saved, result, wordLabels = null) {
  const gaps = new Map(normalizedGapItems(item).map((gap, index) => [String(gap.id), { gap, index }]));
  return String(item.briefText ?? "").split(/\n{2,}/).map((paragraph) => {
    let cursor = 0;
    let content = "";
    const placeholder = /\[(\d+)(b?)\]/g;
    for (const match of paragraph.matchAll(placeholder)) {
      content += inlineRichText(paragraph.slice(cursor, match.index)).replace(/\n/g, "<br>");
      const entry = gaps.get(match[1]);
      if (!entry) {
        content += escapeHtml(match[0]);
      } else {
        const { gap, index } = entry;
        const options = gap.opts ? gap.opts.map((_, optionIndex) => String.fromCharCode(97 + optionIndex)) : Object.keys(wordLabels || {});
        const labels = gap.opts
          ? Object.fromEntries(options.map((letter, optionIndex) => [letter, splitPairedOption(gap.opts[optionIndex], Boolean(match[2]))]))
          : wordLabels;
        const feedback = feedbackClass(result, saved[String(index)], gap.answer);
        const answerLabel = optionDisplayLabel(gap.answer, labels);
        content += `${selectControl(String(index), options, saved[String(index)], `Lücke ${match[1]}${match[2]}`, labels, `telc-inline-select ${feedback}`)}<span class="telc-gap-evidence-answer" aria-label="Richtige Antwort">✓ ${escapeHtml(answerLabel)}</span>`;
      }
      cursor = match.index + match[0].length;
    }
    content += inlineRichText(paragraph.slice(cursor)).replace(/\n/g, "<br>");
    return `<p>${content}</p>`;
  }).join("");
}

function splitPairedOption(option, useSecondPart) {
  const parts = String(option).split(/\s*\.\.\.\s*/);
  return parts.length > 1 ? parts[useSecondPart ? 1 : 0] : option;
}

function radioQuestion(questionKey, prompt, options, saved, expected, result, mode, evidence = "", clues = []) {
  return `<fieldset class="telc-radio-question"><legend>${escapeHtml(prompt)}</legend>${options.map((option, index) => {
    const value = mode === "boolean" ? String(index === 0) : mode === "index" ? String(index) : String.fromCharCode(97 + index);
    const stateClass = result ? String(value) === String(expected) ? "is-correct" : String(saved) === value ? "is-wrong" : "" : "";
    return `<label class="${stateClass}"><input type="radio" name="q-${questionKey}" data-telc-answer="${questionKey}" value="${value}" ${String(saved) === value ? "checked" : ""}><span>${escapeHtml(option)}</span></label>`;
  }).join("")}${evidence ? `<button class="telc-question-evidence" type="button" data-telc-question-evidence aria-expanded="false"><span>Hinweis anzeigen</span></button><p class="telc-question-evidence__panel" data-telc-question-evidence-panel hidden><strong>Richtige Aussage:</strong> ${escapeHtml(evidence)}${clues.length ? `<br><strong>Schlüsselwörter:</strong> ${clues.map((clue) => `<mark>${escapeHtml(clue)}</mark>`).join(" · ")}` : ""}</p>` : ""}</fieldset>`;
}

function selectControl(question, options, saved, placeholder, labels = null, className = "") {
  const selected = options.find((value) => String(saved) === String(value));
  const displayLabel = selected == null ? placeholder : optionDisplayLabel(selected, labels);
  const listboxId = `telc-select-${question}-${Math.random().toString(36).slice(2, 8)}`;
  return `<span class="telc-custom-select ${className}" data-telc-custom-select data-question="${escapeAttribute(question)}">
    <button class="telc-custom-select__trigger ${selected == null ? "" : "has-value"}" type="button" data-telc-select-trigger aria-haspopup="listbox" aria-expanded="false" aria-controls="${listboxId}" aria-label="${escapeAttribute(placeholder)}"><span data-telc-select-label>${escapeHtml(displayLabel)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>
    <span class="telc-custom-select__menu" id="${listboxId}" role="listbox" data-telc-select-menu hidden>${options.map((value) => {
    const isSelected = String(saved) === String(value);
    const title = labels ? stripFormatting(labels[value]) : "";
    const display = optionDisplayLabel(value, labels);
    return `<button class="telc-custom-select__option ${isSelected ? "is-selected" : ""}" type="button" role="option" aria-selected="${isSelected}" data-telc-select-option data-value="${escapeAttribute(value)}" data-display="${escapeAttribute(display)}" title="${escapeAttribute(display)}"><strong>${escapeHtml(String(value).toUpperCase())}</strong>${title ? `<span>${escapeHtml(title)}</span>` : ""}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>`;
  }).join("")}</span>
  </span>`;
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
  if (module === "lesenTeil1" && item.blocks) return Object.fromEntries(item.gaps.map((gap) => [String(gap), item.answerKey[gap]]));
  if (module === "lesenTeil1") return Object.fromEntries(item.answers.map((answer, index) => [String(index), answer]));
  if (module === "lesenTeil2") {
    const questions = item.questions || item.variants?.[0]?.fragen || [];
    return Object.fromEntries(questions.map((question, index) => [String(index), question.answer ?? question.correct]));
  }
  if (module === "lesenTeil3") return Object.fromEntries(item.situations.map((entry, index) => [String(index), entry.answer]));
  if (module.startsWith("sprachbausteine")) return Object.fromEntries(normalizedGapItems(item).map((entry, index) => [String(index), entry.answer]));
  if (module.startsWith("hoeren") && item.items?.every((entry) => typeof entry.answer === "boolean")) return Object.fromEntries(item.items.map((entry, index) => [String(index), String(entry.answer)]));
  if (item.sourceModel && module === "hoerenTeil1") return Object.fromEntries((item.sourceModel.questions || []).map((question, index) => [String(index), question.key]));
  if (item.sourceModel && module === "hoerenTeil2") return Object.fromEntries((item.items || []).map((question, index) => [String(index), question.answer]));
  if (item.sourceModel && module === "lesenTeil3") return Object.fromEntries((item.situations || []).map((question, index) => [String(index), question.answer === "true" ? "a" : question.answer === "false" ? "b" : "c"]));
  return null;
}

function normalizedGapItems(item) {
  if (Array.isArray(item.items)) return item.items;
  return Object.entries(item.answers || {}).map(([id, answer]) => ({ id, answer }));
}

function levelStats(level, data, state) {
  const keys = Object.entries(data.modules).flatMap(([module, items]) => items.flatMap((item) => Array.from({ length: item.count || 1 }, (_, index) => exerciseKey(level, module, { ...item, key: `${item.key}:${index}` }))));
  const completed = keys.filter((key) => state.completed[key]).length;
  return { total: keys.length, completed, percent: keys.length ? Math.round((completed / keys.length) * 100) : 0 };
}

function exerciseKey(level, module, item) {
  return `${level}:${module}:${item.key ?? item.id}`;
}

function modulesForArea(level, areaKey, data) {
  const area = AREA_META[areaKey];
  return (data?.areaModules?.[areaKey] || area?.modules || []).filter((module) => data?.modules?.[module]);
}

function exerciseTitle(item) {
  const rawTitle = item.title && typeof item.title === "object" ? item.title.de : item.title;
  return String(rawTitle || item.titel || item.name || item.thema || "Übung")
    .replace(/\s*جديد\s*✨?/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function exerciseSubtitle(module, item) {
  if (module === "schreiben") return `${item.punkte?.length || 0} نقاط للمعالجة`;
  if (module === "sprechen") return escapeHtml(item.thema || "Mündliche Prüfung");
  if (item.items) return `${item.items.length} Aufgaben`;
  if (item.texte) return `${item.texte.length} Texte · ${item.headings.length} Überschriften`;
  if (item.situations) return `${item.situations.length} Situationen`;
  if (item.blocks) return `${item.gaps?.length || 0} Lücken · C1 Leseverstehen`;
  if (item.aussagen) return `${item.aussagen.length} Aussagen · تدريب ذاتي بلا مفتاح إجابة`;
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

function renderLoadError(error) {
  const detail = error?.name === "AbortError"
    ? "استغرق تحميل التمرين وقتًا أطول من المتوقع. أعد المحاولة."
    : "تعذر تحميل بيانات هذا القسم. أعد المحاولة أو ارجع إلى القائمة.";
  return `<div class="telc-loading telc-loading--error"><strong>تعذر تجهيز التمرين</strong><p>${detail}</p><button type="button" class="telc-primary-button" data-telc-reload>إعادة المحاولة</button></div>`;
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

function buildPassageTextModel(passage) {
  let text = "";
  let paragraphCount = 0;
  const segments = [];

  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const start = text.length;
      text += node.nodeValue;
      segments.push({ node, start, end: text.length });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === "P") {
      if (paragraphCount > 0 && text && !text.endsWith("\n\n")) text += "\n\n";
      paragraphCount += 1;
    } else if (node.tagName === "BR") {
      if (!text.endsWith("\n")) text += "\n";
      return;
    }
    node.childNodes.forEach(visit);
  }

  passage.childNodes.forEach(visit);
  return { text, segments };
}

function passageOffsetAt(model, container, offset) {
  const segment = model.segments.find((part) => part.node === container);
  if (segment) return segment.start + Math.max(0, Math.min(offset, segment.end - segment.start));

  const point = document.createRange();
  point.setStart(container, offset);
  point.collapse(true);
  let previousEnd = 0;
  for (const part of model.segments) {
    const start = document.createRange();
    start.setStart(part.node, 0);
    start.collapse(true);
    if (point.compareBoundaryPoints(Range.START_TO_START, start) <= 0) return part.start;
    const end = document.createRange();
    end.setStart(part.node, part.end - part.start);
    end.collapse(true);
    if (point.compareBoundaryPoints(Range.START_TO_START, end) <= 0) return part.end;
    previousEnd = part.end;
  }
  return previousEnd;
}

function createVocabularyId() {
  return globalThis.crypto?.randomUUID?.() || `vocab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
