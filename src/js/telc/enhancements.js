// Preserve the original bundle and datasets; filter only unsupported local features.
    (function () {
      var ROOT_ID = "root";
      var running = false;
      var libraryCounts = {
        B1: { total: 183, lesen: 62, sprach: 43, schreiben: 21, sprechen: 57 },
        B2: { total: 273, lesen: 96, sprach: 46, schreiben: 21, sprechen: 110 }
      };

      function clean(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
      }

      function textElements(root) {
        return Array.prototype.filter.call(root.querySelectorAll("*"), function (element) {
          return element.children.length === 0;
        });
      }

      function navIcon(name) {
        var paths = {
          home: "<path d='M3 11.5 12 4l9 7.5'/><path d='M5.5 10.5V20h13v-9.5'/><path d='M9.5 20v-6h5v6'/>",
          lesen: "<path d='M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z'/><path d='M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z'/>",
          sb: "<path d='M4 6h16M4 12h10M4 18h7'/><path d='m17 15 3 3m0-3-3 3'/>",
          schreiben: "<path d='M4 20h4l11-11-4-4L4 16v4Z'/><path d='m13.5 6.5 4 4'/>",
          sprechen: "<path d='M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8'/>",
          exam: "<path d='M9 4h6'/><rect x='5' y='3' width='14' height='18' rx='2'/><path d='m8 12 2 2 5-5M8 18h8'/>",
          progress: "<path d='M4 20V10M10 20V4M16 20v-7M22 20H2'/>",
          back: "<path d='m15 18-6-6 6-6'/><path d='M9 12h11'/>"
        };
        return "<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>" + (paths[name] || paths.home) + "</svg>";
      }

      function setNavIcon(element, name) {
        if (!element || element.dataset.tpIcon === name) return;
        element.innerHTML = navIcon(name);
        element.dataset.tpIcon = name;
      }

      function currentLevel(root) {
        var text = clean(root.textContent);
        return /TELC B1|Niveau B1|ZERTIFIKAT DEUTSCH B1/i.test(text) ? "B1" : "B2";
      }

      function removeFeatureCard(element) {
        var card = element.closest(".mhub-card, .home-card, .ex-card, button, [role='button']");
        if (card) {
          card.remove();
          return;
        }

        var parent = element.parentElement;
        if (parent && clean(parent.textContent).length < 280) parent.remove();
      }

      function removeListening(root) {
        root.querySelectorAll("[data-nav]").forEach(function (element) {
          var nav = clean(element.getAttribute("data-nav")).toLowerCase();
          if (/hoeren|hören|audio/.test(nav)) element.remove();
        });

        root.querySelectorAll("h1,h2,h3,h4,button,[role='button']").forEach(function (element) {
          var text = clean(element.textContent);
          if (/^(?:🎧\s*)?(?:Hörverstehen|Hoerverstehen|Hören|Hoeren)(?:\b|\s|—|-)/i.test(text)) {
            removeFeatureCard(element);
          }
        });

        root.querySelectorAll("label.sf").forEach(function (element) {
          if (/^(?:🎧\s*)?(?:Hörverstehen|Hoerverstehen|Hören|Hoeren)/i.test(clean(element.textContent))) element.remove();
        });

        root.querySelectorAll(".gam-col").forEach(function (element) {
          if (/Hörverstehen|Hoerverstehen/i.test(clean(element.textContent))) element.remove();
        });

        textElements(root).forEach(function (element) {
          if (element.closest(".navbar-pro, .mob-nav")) return;
          var text = clean(element.textContent);
          if (/^HÖRVERSTEHEN$/i.test(text)) {
            var stat = element.parentElement;
            if (stat) stat.remove();
          } else if (/^\d+\s+Hören gemacht$/i.test(text)) {
            element.innerHTML = "Lokaler Fortschritt · <span class='tp-ar' dir='rtl' lang='ar'>التقدم المحلي</span>";
          }
        });
      }

      function removeAi(root) {
        root.querySelectorAll("button,a,[role='button']").forEach(function (element) {
          var text = clean(element.textContent);
          if (/\bAI\b|Warum diese Antwort|Pourquoi cette réponse|Générer|Generieren|Modellbrief|Musterbrief|Score-Prognose|Flashcards erstellen|Automatische Bewertung/i.test(text)) {
            element.remove();
          }
        });

        root.querySelectorAll("h1,h2,h3,h4").forEach(function (element) {
          var text = clean(element.textContent);
          if (/\bAI\b|Künstliche Intelligenz|Intelligence Artificielle/i.test(text)) {
            var card = element.closest(".mhub-card, .home-card, .ex-card, .ai-tool-card");
            if (card) card.remove();
          }
        });

        textElements(root).forEach(function (element) {
          var text = clean(element.textContent);
          var replacements = {
            "Briefe + AI-Korrektur": "Briefe und Schreibaufgaben",
            "AI-Korrektur": "Lokale Schreibübung",
            "AI Sprechen-Partner": "lokale Prüfungsvorbereitung",
            "Aussprache-Trainer": "Prüfungsvorbereitung",
            "AI-Coach": "lokale Übungen"
          };
          Object.keys(replacements).forEach(function (key) {
            if (text.indexOf(key) !== -1) {
              element.textContent = element.textContent.replace(key, replacements[key]);
              text = clean(element.textContent);
            }
          });
          if (/^Schreiben Sie mindestens 30 Zeichen$/i.test(text)) element.remove();
          if (/^AI hasard ou selection manuelle$/i.test(text)) element.innerHTML = "Zufällige oder manuelle Auswahl · <span class='tp-ar' dir='rtl' lang='ar'>اختيار عشوائي أو يدوي</span>";
          if (/^Choix des exercices$/i.test(text)) element.innerHTML = "Übungsauswahl · <span class='tp-ar' dir='rtl' lang='ar'>اختيار التمارين</span>";
          if (/^Start manuel$/i.test(text)) element.innerHTML = "Manuell starten · <span class='tp-ar' dir='rtl' lang='ar'>ابدأ يدوياً</span>";
          if (/^Chrono Exam/i.test(text)) element.innerHTML = element.textContent.replace(/Chrono Exam/i, "Prüfungszeit") + " · <span class='tp-ar' dir='rtl' lang='ar'>وقت الامتحان</span>";
          if (/^\d+ XP left until /i.test(text)) element.textContent = element.textContent.replace(/ XP left until /i, " XP bis ");
          if (/^Exam Simulator$/i.test(text)) element.innerHTML = "Prüfungssimulation · <span class='tp-ar' dir='rtl' lang='ar'>محاكاة الامتحان</span>";
          if (/^Komplette TELC .+ · 9 Teile · \d+ Punkte · Echte Aufgaben$/i.test(text)) element.innerHTML = element.textContent.replace(/9 Teile · \d+ Punkte · Echte Aufgaben/i, "6 Teile · lokale Originalaufgaben") + "<br><span class='tp-ar' dir='rtl' lang='ar'>ستة أجزاء من التمارين الأصلية المتاحة</span>";
          if (/^\d+\/9$/.test(text)) element.textContent = text.replace("/9", "/6");
        });
      }

      function updateSelector(root) {
        if (root.querySelector(".es-card-b1, .es-card-b2")) {
          document.body.dataset.telcView = "selector";
          delete document.body.dataset.telcLevel;
          root.classList.remove("tp-exam-app");
        }
        document.documentElement.dir = "rtl";
        document.documentElement.lang = "ar";
        var heading = root.querySelector(".tp-selector-hero h1") || Array.prototype.find.call(root.querySelectorAll("h1"), function (element) {
          return /^(Choose your exam|Prüfung auswählen)/i.test(clean(element.textContent));
        });
        if (heading) {
          if (!heading.dataset.tpLocalized) {
            heading.innerHTML = "<span class='tp-ar tp-selector-title-ar' dir='rtl' lang='ar'>اختر مستوى امتحانك</span><span class='tp-de' dir='ltr' lang='de'>Wähle dein Prüfungsziel</span>";
            heading.dataset.tpLocalized = "true";
          }
          heading.parentElement.classList.add("tp-selector-hero");
          var subtitle = heading.nextElementSibling;
          if (subtitle && subtitle.tagName === "P") {
            subtitle.className = "tp-selector-subtitle";
            subtitle.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>تدرّب بتركيز، تابع تقدمك وابدأ من المستوى المناسب لك.</span><span class='tp-de' dir='ltr' lang='de'>Trainiere gezielt und starte auf deinem passenden Niveau.</span>";
          }
        }

        [[".es-card-b1", "B1"], [".es-card-b2", "B2"]].forEach(function (entry) {
          var card = root.querySelector(entry[0]);
          if (!card) return;
          var level = entry[1];
          card.setAttribute("data-level", level);
          card.setAttribute("aria-label", "TELC " + level + " Prüfungstraining");
          var titleIcon = card.querySelector(":scope > div:nth-child(2) > span:first-child");
          if (titleIcon) titleIcon.remove();
          var counts = libraryCounts[level];
          var leaves = textElements(card);
          leaves.forEach(function (element) {
            var text = clean(element.textContent);
            if (text === "Exercises") {
              if (element.previousElementSibling) element.previousElementSibling.textContent = counts.total;
              element.innerHTML = "<span class='tp-stat-label'><span class='tp-ar' dir='rtl' lang='ar'>تمارين</span><span class='tp-stat-separator' aria-hidden='true'>·</span><span class='tp-de' dir='ltr' lang='de'>ÜBUNGEN</span></span>";
            }
            if (text === "Sections") {
              if (element.previousElementSibling) element.previousElementSibling.textContent = "4";
              element.innerHTML = "<span class='tp-stat-label'><span class='tp-ar' dir='rtl' lang='ar'>أقسام</span><span class='tp-stat-separator' aria-hidden='true'>·</span><span class='tp-de' dir='ltr' lang='de'>BEREICHE</span></span>";
            }
            if (text === "Sprechen" && element.previousElementSibling && clean(element.previousElementSibling.textContent) !== String(counts.sprechen)) {
              element.previousElementSibling.textContent = counts.sprechen;
            }
            if (text === "Sprechen") {
              element.innerHTML = "<span class='tp-stat-label'><span class='tp-ar' dir='rtl' lang='ar'>المحادثة</span><span class='tp-stat-separator' aria-hidden='true'>·</span><span class='tp-de' dir='ltr' lang='de'>SPRECHEN</span></span>";
            }
            if (text === "Start " + level) element.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>ابدأ تدريب TELC " + level + "</span>";
          });
          var description = card.querySelector("p");
          if (description && !description.dataset.tpCleaned) {
            description.dataset.tpCleaned = "true";
            description.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>القراءة والتراكيب اللغوية والكتابة والتحدث</span><span class='tp-de' dir='ltr' lang='de'>Lesen · Sprachbausteine · Schreiben · Sprechen</span>";
          }
        });

        if (heading) {
          var selectorShell = heading.parentElement.parentElement;
          selectorShell.classList.add("tp-local-selector-shell");
          selectorShell.dir = "rtl";

          var topBar = root.querySelector(".tp-local-selector-bar");
          if (!topBar) {
            topBar = document.createElement("nav");
            topBar.className = "tp-local-selector-bar";
            topBar.setAttribute("aria-label", "TELC navigation");
            selectorShell.insertBefore(topBar, selectorShell.firstChild);
          }

          var brand = root.querySelector(".tp-local-selector-brand");
          if (!brand) {
            brand = document.createElement("div");
            brand.className = "tp-local-selector-brand";
          }
          if (!brand.dataset.tpHeader) {
            brand.innerHTML = "<span class='tp-local-brand-logo-shell' aria-hidden='true'><img class='tp-local-brand-icon' src='./src/assets/Deutsch%20mit%20Rinkute.ico' alt=''></span><span class='tp-local-brand-copy'><b dir='ltr'>Deutsch mit Mira</b><small>استوديو الامتحانات</small></span>";
            brand.dataset.tpHeader = "true";
          }
          if (brand.parentElement !== topBar) topBar.insertBefore(brand, topBar.firstChild);

          var backLink = root.querySelector(".es-footer-link");
          if (backLink) {
            backLink.setAttribute("aria-label", "العودة إلى منصة التعلّم");
            if (!backLink.dataset.tpHeader) {
              backLink.innerHTML = "<svg class='tp-header-action-icon' viewBox='0 0 24 24' aria-hidden='true' focusable='false'><path d='M20 12H5'/><path d='m11 18-6-6 6-6'/></svg><span class='tp-header-action-label'>العودة إلى منصة التعلّم</span><span class='tp-header-action-short'>المنصة</span>";
              backLink.dataset.tpHeader = "true";
            }
            if (backLink.parentElement !== topBar) topBar.appendChild(backLink);
          }
        }
      }

      function updateDashboard(root) {
        if (root.querySelector(".es-card-b1, .es-card-b2")) return;
        var level = currentLevel(root);
        document.body.dataset.telcView = "dashboard";
        document.body.dataset.telcLevel = level.toLowerCase();
        document.documentElement.dir = "rtl";
        document.documentElement.lang = "ar";
        root.classList.add("tp-exam-app");
        var counts = libraryCounts[level];
        var navCopy = {
          home: { label: "الرئيسية", title: "الصفحة الرئيسية" },
          lesen: { label: "القراءة", title: "تمارين القراءة" },
          sb: { label: "التراكيب", title: "التراكيب اللغوية" },
          schreiben: { label: "الكتابة", title: "تمارين الكتابة" },
          sprechen: { label: "المحادثة", title: "تمارين المحادثة" },
          exam: { label: "المحاكاة", title: "محاكاة الامتحان" },
          progress: { label: "النتائج", title: "النتائج والتقدم" },
          back: { label: "تغيير المستوى", title: "تغيير مستوى الامتحان" }
        };

        root.querySelectorAll(".navbar-pro .navbar-btn[data-nav], .mob-menu-btn[data-nav]").forEach(function (button) {
          var item = navCopy[button.getAttribute("data-nav")];
          if (!item) return;
          var icon = button.querySelector(".navbar-icon");
          var label = button.querySelector(".navbar-label");
          setNavIcon(icon || button.querySelector("span:first-child"), button.getAttribute("data-nav"));
          if (label && clean(label.textContent) !== item.label) label.textContent = item.label;
          button.title = item.title;
          button.setAttribute("aria-label", item.title);
        });

        root.querySelectorAll(".navbar-pro").forEach(function (nav) {
          var desk = nav.querySelector(".desk-nav");
          var actions = nav.querySelector(".navbar-actions");
          var back = nav.querySelector(".navbar-btn-back");
          var logoLabel = nav.querySelector(".navbar-logo > span:not(.navbar-premium-badge):not(.tp-local-dashboard-logo-shell)");
          var brandLabel = "Deutsch mit Miraاستوديو امتحانات TELC " + level;
          if (logoLabel && clean(logoLabel.textContent).replace(/\s/g, "") !== brandLabel.replace(/\s/g, "")) {
            logoLabel.classList.add("tp-local-dashboard-brand-copy");
            logoLabel.innerHTML = "<strong dir='ltr'>Deutsch mit Mira</strong><small>استوديو امتحانات TELC " + level + "</small>";
          }
          if (back) {
            back.title = "تغيير مستوى الامتحان";
            back.setAttribute("aria-label", "تغيير مستوى الامتحان");
            var backIcon = back.querySelector(".navbar-icon");
            var backLabel = back.querySelector(".navbar-label");
            setNavIcon(backIcon || back.querySelector("span:first-child"), "back");
            if (backLabel && clean(backLabel.textContent) !== "تغيير المستوى") backLabel.textContent = "تغيير المستوى";
            if (actions && back.parentElement !== actions) actions.appendChild(back);
          }
          if (desk) desk.setAttribute("aria-label", "TELC " + level + " Hauptnavigation");
        });
        var statMap = {
          "LESEVERSTEHEN": counts.lesen,
          "SPRACHBAUSTEINE": counts.sprach,
          "SCHREIBEN": counts.schreiben,
          "SPRECHEN": counts.sprechen
        };

        root.querySelectorAll("*").forEach(function (element) {
          Array.prototype.forEach.call(element.childNodes, function (node) {
            if (node.nodeType === 3 && / left until /i.test(node.nodeValue || "")) {
              node.nodeValue = node.nodeValue.replace(/ left until /i, " bis ");
            }
          });
        });

        textElements(root).forEach(function (element) {
          if (element.closest(".navbar-pro, .mob-nav")) return;
          var text = clean(element.textContent);
          var statName = text.toUpperCase();
          if (statMap[statName] !== undefined && element.previousElementSibling) {
            if (clean(element.previousElementSibling.textContent) !== String(statMap[statName])) {
              element.previousElementSibling.textContent = statMap[statName];
            }
          }
          if (text === "Exam") element.innerHTML = "Prüfung · <span class='tp-ar' dir='rtl' lang='ar'>الامتحان</span>";
          if (/^WEEKLY CHALLENGE$/i.test(text)) element.innerHTML = "WOCHENAUFGABE · <span class='tp-ar' dir='rtl' lang='ar'>التحدي الأسبوعي</span>";
          if (/^Complete 5 Leseverstehen this week$/i.test(text)) element.innerHTML = "Diese Woche 5 Leseübungen abschließen · <span class='tp-ar' dir='rtl' lang='ar'>أكمل 5 تمارين قراءة هذا الأسبوع</span>";
          if (/^\d+\/\d+ done$/i.test(text)) element.textContent = text.replace("done", "erledigt");
          if (/^Reward:/i.test(text)) element.textContent = element.textContent.replace(/Reward:/i, "Belohnung:").replace(/badge/ig, "Abzeichen");
          if (/^RANKING$/i.test(text)) element.innerHTML = "RANGLISTE · <span class='tp-ar' dir='rtl' lang='ar'>الترتيب</span>";
          if (/^See your position among learners/i.test(text)) element.innerHTML = "Anonyme Position unter Lernenden · <span class='tp-ar' dir='rtl' lang='ar'>ترتيب مجهول بين المتعلمين</span>";
          if (text === "Activate") element.innerHTML = "Aktivieren · <span class='tp-ar' dir='rtl' lang='ar'>تفعيل</span>";
          if (/^\d+\+ (?:echte Aufgaben|authentic exercises)/i.test(text) || /AI-Korrektur|AI-Coach/.test(text)) {
            element.innerHTML = counts.total + " Übungssätze · Prüfungssimulation<br><span class='tp-ar' dir='rtl' lang='ar'>تمارين أصلية ومحاكاة الامتحان</span>";
          }
          if (/^Sujet \d+$/i.test(text)) element.textContent = text.replace("Sujet", "Thema");
        });

        root.querySelectorAll(".mhub-card").forEach(function (card) {
          var heading = card.querySelector("h3");
          if (!heading) return;
          var name = clean(heading.textContent);
          var value = name === "Leseverstehen" ? counts.lesen : name === "Sprachbausteine" ? counts.sprach : name === "Schreiben" ? counts.schreiben : name === "Sprechen" ? counts.sprechen : null;
          if (value === null) return;
          textElements(card).forEach(function (element) {
            if (/^\d+$/.test(clean(element.textContent)) && clean(element.textContent) !== String(value)) element.textContent = value;
          });
        });

        root.querySelectorAll(".navbar-logo").forEach(function (logo) {
          if (!logo.querySelector(".tp-local-brand-icon")) {
            var shell = document.createElement("span");
            shell.className = "tp-local-dashboard-logo-shell";
            shell.setAttribute("aria-hidden", "true");
            var image = document.createElement("img");
            image.className = "tp-local-brand-icon";
            image.src = "./src/assets/Deutsch%20mit%20Rinkute.ico";
            image.alt = "";
            shell.appendChild(image);
            logo.insertBefore(shell, logo.firstChild);
          }
        });

        var dashboardHome = root.querySelector(".mhub-stats");
        var resultsHeading = Array.prototype.find.call(root.querySelectorAll("main h1"), function (element) {
          return /^Ergebnisbogen\b/i.test(clean(element.textContent));
        });
        document.body.dataset.telcScreen = dashboardHome ? "home" : resultsHeading ? "results" : "exercise";
        if (dashboardHome) {
          delete document.body.dataset.telcExercise;
        } else if (resultsHeading) {
          delete document.body.dataset.telcExercise;
        } else {
          var exerciseHeading = root.querySelector("main h1");
          var exerciseTitle = exerciseHeading ? clean(exerciseHeading.textContent) : "";
          document.body.dataset.telcExercise = /^Leseverstehen$/i.test(exerciseTitle) ? "reading-library" : /Sprechen\s*(?:—|-)|Mündliche|Muendliche/i.test(exerciseTitle) ? "speaking-library" : "detail";
        }
        root.dir = "rtl";

        if (resultsHeading) {
          var resultsMain = resultsHeading.closest("main");
          var resultsPage = Array.prototype.find.call(resultsMain.children, function (child) {
            return child.contains(resultsHeading);
          }) || resultsHeading.parentElement.parentElement;
          resultsPage.classList.add("tp-results-page");
          resultsHeading.parentElement.classList.add("tp-results-hero");
          var resultLevel = /B2/i.test(clean(resultsHeading.textContent)) ? "B2" : "B1";
          if (!resultsHeading.dataset.tpLocalized) {
            resultsHeading.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>تقرير نتائج امتحان TELC " + resultLevel + "</span><small class='tp-de' dir='ltr' lang='de'>Ergebnisbogen · telc Deutsch " + resultLevel + "</small>";
            resultsHeading.dataset.tpLocalized = "true";
          }
          var resultsIntro = resultsHeading.nextElementSibling;
          if (resultsIntro && !resultsIntro.dataset.tpLocalized) {
            var completedMatch = clean(resultsIntro.textContent).match(/\d+/);
            var completedCount = completedMatch ? completedMatch[0] : "0";
            resultsIntro.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>" + completedCount + " تمارين مكتملة · تقدير مبني على نتائج تدريبك</span><small class='tp-de' dir='ltr' lang='de'>" + completedCount + " Übungen abgeschlossen · Schätzung anhand deiner Trainingsresultate</small>";
            resultsIntro.dataset.tpLocalized = "true";
          }

          var resultCards = resultsPage.querySelectorAll(":scope > .card");
          resultCards.forEach(function (card, index) {
            card.classList.add("tp-results-card");
            if (index === 0) card.classList.add("tp-results-summary");
          });

          var resultLabels = {
            "Gesamtergebnis": ["النتيجة الإجمالية", "Gesamtergebnis"],
            "Notenskala telc B1": ["سُلّم تقييم TELC B1", "Notenskala telc B1"],
            "Notenskala telc B2": ["سُلّم تقييم TELC B2", "Notenskala telc B2"],
            "Schriftliche Prüfung": ["الاختبار الكتابي", "Schriftliche Prüfung"],
            "Mündliche Prüfung": ["الاختبار الشفهي", "Mündliche Prüfung"],
            "Schriftlich gesamt": ["المجموع الكتابي", "Schriftlich gesamt"],
            "Schriftlicher Ausdruck": ["التعبير الكتابي", "Schriftlicher Ausdruck"],
            "Leseverstehen": ["فهم القراءة", "Leseverstehen"],
            "Sprachbausteine": ["التراكيب اللغوية", "Sprachbausteine"],
            "Hörverstehen": ["فهم الاستماع", "Hörverstehen"]
          };
          textElements(resultsPage).forEach(function (element) {
            var labelText = clean(element.textContent);
            var labelValue = resultLabels[labelText];
            if (labelValue) {
              element.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>" + labelValue[0] + "</span><small class='tp-de' dir='ltr' lang='de'>" + labelValue[1] + "</small>";
            } else if (/Details anzeigen/i.test(labelText)) {
              element.innerHTML = "عرض التفاصيل <small class='tp-de-inline' dir='ltr' lang='de'>· Details</small>";
            } else if (/Ergebnisse zur(?:ue|ü)cksetzen/i.test(labelText)) {
              element.textContent = "إعادة ضبط النتائج";
            }
          });

          var gradeLabel = Array.prototype.find.call(resultsPage.querySelectorAll("p"), function (element) {
            return /Notenskala telc/i.test(clean(element.textContent));
          });
          if (gradeLabel && gradeLabel.parentElement) gradeLabel.parentElement.classList.add("tp-grade-scale");

          var totalLabel = Array.prototype.find.call(resultsPage.querySelectorAll("p"), function (element) {
            return /^النتيجة الإجمالية/.test(clean(element.textContent));
          });
          if (totalLabel && totalLabel.parentElement) totalLabel.parentElement.classList.add("tp-results-total");

          var writtenCard = resultCards[1];
          var breakdownGrid = writtenCard && Array.prototype.find.call(writtenCard.querySelectorAll("div"), function (element) {
            return element.style.display === "grid" && element.children.length >= 3;
          });
          if (breakdownGrid) {
            Array.prototype.slice.call(breakdownGrid.children).forEach(function (panel) {
              var panelText = clean(panel.textContent);
              if (/\bT1\s*\+\s*\d+\s*T2\b/i.test(panelText) && !/Leseverstehen|فهم القراءة/i.test(panelText)) panel.remove();
            });
            Array.prototype.forEach.call(breakdownGrid.children, function (panel) {
              panel.classList.add("tp-results-breakdown");
            });
          }

          resultsPage.querySelectorAll("p").forEach(function (element) {
            if (/^(?:فهم القراءة|التراكيب اللغوية|فهم الاستماع)/.test(clean(element.textContent)) && element.parentElement && element.parentElement.parentElement) {
              element.parentElement.parentElement.classList.add("tp-results-breakdown");
            }
          });
        }

        if (dashboardHome) {
          var arabicHeadings = {
            "Leseverstehen": ["القراءة", "Leseverstehen"],
            "Sprachbausteine": ["التراكيب اللغوية", "Sprachbausteine"],
            "Schreiben": ["الكتابة", "Schreiben"],
            "Sprechen": ["المحادثة", "Sprechen"],
            "Ergebnisse": ["النتائج", "Ergebnisse"]
          };
          root.querySelectorAll(".mhub-card h3").forEach(function (element) {
            var value = arabicHeadings[clean(element.textContent)];
            if (value) element.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>" + value[0] + "</span><small class='tp-de' dir='ltr' lang='de'>" + value[1] + "</small>";
          });

          var arabicStats = {
            "LESEVERSTEHEN": ["القراءة", "Leseverstehen"],
            "SPRACHBAUSTEINE": ["التراكيب اللغوية", "Sprachbausteine"],
            "SCHREIBEN": ["الكتابة", "Schreiben"],
            "SPRECHEN": ["المحادثة", "Sprechen"]
          };
          dashboardHome.querySelectorAll(".mhub-stat").forEach(function (stat) {
            textElements(stat).forEach(function (element) {
              var value = arabicStats[clean(element.textContent).toUpperCase()];
              if (value) element.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>" + value[0] + "</span><small class='tp-de' dir='ltr' lang='de'>" + value[1] + "</small>";
            });
          });

          var pageHeading = Array.prototype.find.call(root.querySelectorAll("main h1, main h2"), function (element) {
            return /TELC\s+B[12]/i.test(clean(element.textContent));
          });
          if (pageHeading && !pageHeading.dataset.tpLocalized) {
            pageHeading.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>استعد لاجتياز امتحان TELC " + level + "</span><small class='tp-de' dir='ltr' lang='de'>Bestehe deine TELC " + level + " Prüfung</small>";
            pageHeading.dataset.tpLocalized = "true";
          }

          var pageIntro = pageHeading && pageHeading.nextElementSibling;
          if (pageIntro && /Übungssätze/i.test(clean(pageIntro.textContent)) && !pageIntro.dataset.tpLocalized) {
            pageIntro.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>" + counts.total + " مجموعة تمارين ومحاكاة كاملة للامتحان</span><small class='tp-de' dir='ltr' lang='de'>" + counts.total + " Übungssätze · Prüfungssimulation</small>";
            pageIntro.dataset.tpLocalized = "true";
          }

          var cardDescriptions = {
            "Teil 1 · 2 · 3": "الأجزاء 1 · 2 · 3",
            "Grammatik · Lückentext": "القواعد · نصوص بفراغات",
            "Briefe und Schreibaufgaben": "رسائل ومواضيع للكتابة",
            "32 Dialoge · Aussprache": "حوارات وتمارين النطق"
          };
          root.querySelectorAll(".mhub-card").forEach(function (card) {
            var paragraph = card.querySelector("p");
            var description = paragraph && cardDescriptions[clean(paragraph.textContent)];
            if (description) paragraph.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>" + description + "</span><small class='tp-de' dir='ltr' lang='de'>" + clean(paragraph.textContent) + "</small>";
            textElements(card).forEach(function (element) {
              var text = clean(element.textContent);
              if (text === "Aufgaben" || text === "Übungen") element.textContent = "تمرين";
              if (text === "Themen") element.textContent = "موضوع";
              if (text === "erledigt") element.textContent = "مكتمل";
            });
          });

          root.querySelectorAll(".gam-col").forEach(function (column) {
            var card = column.closest(".card");
            if (card) card.classList.add("tp-gamification-card");
          });

          var gamification = root.querySelector(".tp-gamification-card");
          if (gamification) {
            gamification.querySelectorAll("p").forEach(function (paragraph) {
              var text = clean(paragraph.textContent);
              if (/XP bis Fortgeschritten/i.test(text)) paragraph.innerHTML = "<strong>500 XP</strong> للوصول إلى المستوى المتقدم";
              if (/Anonyme Position unter Lernenden/i.test(text)) paragraph.textContent = "ترتيب اختياري ومجهول بين المتعلمين";
            });
            textElements(gamification).forEach(function (element) {
              var text = clean(element.textContent);
              if (/DEIN LEVEL/i.test(text)) element.textContent = "مستواك";
              if (/Anfänger/i.test(text)) element.textContent = "مبتدئ";
              if (/RANGLISTE/i.test(text)) element.textContent = "ترتيب المتعلمين";
              if (/Aktivieren/i.test(text)) element.textContent = "تفعيل";
            });
            [
              [/RANGLISTE|RANKING/i, "ترتيب المتعلمين"],
              [/Aktivieren|Activate/i, "تفعيل"]
            ].forEach(function (entry) {
              var target = Array.prototype.filter.call(gamification.querySelectorAll("button,h2,h3,h4,div,span"), function (element) {
                return entry[0].test(clean(element.textContent)) && clean(element.textContent).length < 48;
              }).sort(function (a, b) {
                return clean(a.textContent).length - clean(b.textContent).length;
              })[0];
              if (target) target.textContent = entry[1];
            });
            gamification.querySelectorAll(".gam-col").forEach(function (column) {
              if (/ترتيب المتعلمين|ترتيب اختياري|RANGLISTE|RANKING/i.test(clean(column.textContent))) column.remove();
            });
            gamification.classList.add("tp-level-only");
          }

          root.querySelectorAll(".mhub-card h3").forEach(function (heading) {
            if (heading.dataset.tpLocalized || !/Prüfungssimulation/i.test(clean(heading.textContent))) return;
            heading.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>محاكاة الامتحان</span><small class='tp-de' dir='ltr' lang='de'>Prüfungssimulation</small>";
            heading.dataset.tpLocalized = "true";
            var paragraph = heading.parentElement && heading.parentElement.querySelector("p");
            if (paragraph) {
              paragraph.innerHTML = "<span class='tp-ar' dir='rtl' lang='ar'>اختبار كامل بصيغة الامتحان مع مؤقت</span><small class='tp-de' dir='ltr' lang='de'>Kompletter Test im Prüfungsformat mit Timer</small>";
              paragraph.dataset.tpLocalized = "true";
            }
          });

          var skillsGrid = root.querySelector(".mhub-skills");
          var simulationHeading = Array.prototype.find.call(root.querySelectorAll(".mhub-card h3"), function (heading) {
            return /Prüfungssimulation/i.test(clean(heading.textContent));
          });
          var simulationCard = simulationHeading && simulationHeading.closest(".mhub-card");
          if (simulationCard) simulationCard.classList.add("tp-simulation-card");
          if (skillsGrid && simulationCard && simulationCard.parentElement !== skillsGrid) {
            var oldSimulationSection = simulationCard.closest("section");
            skillsGrid.appendChild(simulationCard);
            if (oldSimulationSection && !oldSimulationSection.querySelector(".mhub-card")) oldSimulationSection.remove();
          }

          if (skillsGrid) {
            skillsGrid.querySelectorAll(":scope > .mhub-card:not(.tp-simulation-card)").forEach(function (card) {
              if (card.dataset.tpLayout === "true") return;
              var content = Array.prototype.find.call(card.children, function (child) {
                return !child.classList.contains("mhub-card-glow");
              });
              if (!content || content.children.length < 2) return;
              var header = content.children[0];
              var footer = content.children[1];
              var headingBlock = header && header.children[1];
              var description = headingBlock && headingBlock.querySelector("p");
              var count = footer && footer.children[0];
              var arrow = footer && footer.children[1];
              content.classList.add("tp-skill-content");
              header.classList.add("tp-skill-header");
              footer.classList.add("tp-skill-footer");
              if (count) {
                count.classList.add("tp-skill-count");
                header.appendChild(count);
              }
              if (description) {
                description.classList.add("tp-skill-description");
                footer.appendChild(description);
              }
              if (arrow) arrow.remove();
              card.dataset.tpLayout = "true";
            });

            if (simulationCard && simulationCard.dataset.tpLayout !== "true") {
              var simulationContent = Array.prototype.find.call(simulationCard.children, function (child) {
                return !child.classList.contains("mhub-card-glow");
              });
              var simulationIcon = simulationContent && simulationContent.children[0];
              var simulationText = simulationContent && simulationContent.children[1];
              var simulationDescription = simulationText && simulationText.querySelector("p");
              if (simulationContent && simulationIcon && simulationText) {
                var simulationHeader = document.createElement("div");
                var simulationFooter = document.createElement("div");
                var simulationMetric = document.createElement("div");
                simulationHeader.className = "tp-skill-header tp-simulation-header";
                simulationFooter.className = "tp-skill-footer tp-simulation-footer";
                simulationMetric.className = "tp-skill-count tp-simulation-metric";
                simulationMetric.innerHTML = "<span>1</span><small>اختبار</small>";
                simulationHeader.appendChild(simulationIcon);
                simulationHeader.appendChild(simulationText);
                simulationHeader.appendChild(simulationMetric);
                if (simulationDescription) {
                  simulationDescription.classList.add("tp-skill-description");
                  simulationFooter.appendChild(simulationDescription);
                }
                simulationContent.replaceChildren(simulationHeader, simulationFooter);
                simulationContent.classList.add("tp-skill-content");
                simulationCard.dataset.tpLayout = "true";
              }
            }
          }

          textElements(root).forEach(function (element) {
            if (element.closest(".navbar-pro, .mob-nav, .mhub-card, .mhub-stats")) return;
            var text = clean(element.textContent);
            if (/^DEIN LEVEL$/i.test(text)) element.textContent = "مستواك";
            if (/^Anfänger$/i.test(text)) element.innerHTML = "مبتدئ <small class='tp-de-inline' dir='ltr' lang='de'>· Anfänger</small>";
            if (/^\d+ XP bis Fortgeschritten$/i.test(text)) element.textContent = text.replace(" bis Fortgeschritten", " للوصول إلى المستوى المتقدم");
            if (/^RANGLISTE/i.test(text)) element.textContent = "ترتيب المتعلمين";
            if (/^Anonyme Position unter Lernenden/i.test(text)) element.textContent = "ترتيب اختياري ومجهول بين المتعلمين";
            if (/^Aktivieren/i.test(text)) element.textContent = "تفعيل";
          });
        }
      }

      function goBackInsideTelc(root) {
        if (root.querySelector(".es-card-b1, .es-card-b2")) return;

        var contentBack = Array.prototype.find.call(root.querySelectorAll("main button, main a[role='button']"), function (element) {
          var text = clean(element.textContent);
          return /^(?:←|‹)?\s*(?:Zurück|Zurueck|Back|Retour)\b/i.test(text) || /(?:zurück|zurueck)\s+(?:zur|zu|zum)/i.test(text);
        });
        if (contentBack) {
          contentBack.click();
          return;
        }

        if (document.body.dataset.telcScreen === "exercise") {
          var home = root.querySelector(".navbar-pro [data-nav='home'], .mob-menu [data-nav='home']");
          if (home) home.click();
          return;
        }

        var levelBack = root.querySelector(".navbar-pro [data-nav='back'], .mob-menu [data-nav='back']");
        if (levelBack) levelBack.click();
      }

      function installHistoryGuard(root) {
        if (window.__tpTelcHistoryGuard) return;
        window.__tpTelcHistoryGuard = true;
        var url = window.location.href;
        window.history.replaceState({ tpTelc: "base" }, "", url);
        window.history.pushState({ tpTelc: "active" }, "", url);
        window.addEventListener("popstate", function () {
          window.history.pushState({ tpTelc: "active" }, "", window.location.href);
          goBackInsideTelc(root);
        });
      }

      function sanitize() {
        if (running) return;
        running = true;
        try {
          var root = document.getElementById(ROOT_ID);
          if (!root) return;
          removeListening(root);
          removeAi(root);
          updateSelector(root);
          updateDashboard(root);
        } finally {
          running = false;
        }
      }

      function start() {
        var root = document.getElementById(ROOT_ID);
        if (!root) return;
        sanitize();
        installHistoryGuard(root);
        var observer = new MutationObserver(function () {
          observer.disconnect();
          sanitize();
          observer.observe(root, { childList: true, subtree: true });
        });
        observer.observe(root, { childList: true, subtree: true });
      }

      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
      else start();
    })();
