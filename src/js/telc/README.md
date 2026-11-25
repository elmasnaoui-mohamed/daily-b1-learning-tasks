# TELC Prüfungsstudio

The TELC experience is an original module inside the Deutsch mit Mira learning
platform. It uses the same `index.html`, header, hash router, visual tokens, and
browser-local persistence as the course experience.

## Architecture

- `../telc-app.js` renders the selector, dashboards, libraries, exercises,
  scoring, results, writing drafts, and speaking notes.
- `../../css/telc.css` contains the responsive TELC visual system.
- `../../data/telc/b1.json` and `../../data/telc/b2.json` contain exam content
  only. They do not contain UI or application logic.
- Routes start at `#/telc`, for example `#/telc/B1/lesen/lesenTeil1/0`.
- Progress is stored under `deutschMira:telc:v1` in `localStorage`.

There is no separate TELC website, minified application bundle, premium wall,
authentication shim, or DOM-patching compatibility layer.

Run `node scripts/verify-telc.mjs` after changing the module or datasets.
