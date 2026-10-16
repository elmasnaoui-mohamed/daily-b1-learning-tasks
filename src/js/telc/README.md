# TELC integration

The TELC experience is part of the main Deutsch mit Mira source tree. It is
loaded by `telc-exams.html`; there is no second website directory.

## Files

- `app.bundle.js` — the preserved exam engine and exercise datasets.
- `boot.js` — stale service-worker cleanup before the app starts.
- `runtime.js` — local session and API compatibility layer required by the
  preserved engine.
- `enhancements.js` — product copy, unavailable-feature filtering, shared
  navigation, and DOM hooks used by the new shell.
- `../../css/telc-legacy.css` — original component styles required by the
  engine.
- `../../css/telc-shell.css` — the maintained Prüfungsstudio visual system and
  responsive overrides.
- `../../vendor/` — local React runtime used by the exam engine.

## Maintenance contract

Do not edit the minified bundle for visual or copy changes. Put those changes
in `enhancements.js` and `telc-shell.css`. Keep the local-storage keys and the
API compatibility layer stable so existing learner progress survives updates.

Run `node scripts/verify-telc.mjs` after changing the integration, then open
both B1 and B2 from `telc-exams.html` and confirm that an exercise library opens.
