import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(new URL(path, new URL("../", import.meta.url)), "utf8");

const html = await read("telc-exams.html");
const boot = await read("src/js/telc/boot.js");
const runtime = await read("src/js/telc/runtime.js");
const enhancements = await read("src/js/telc/enhancements.js");
const shellCss = await read("src/css/telc-shell.css");
const netlifyHeaders = await read("_headers");

assert.doesNotMatch(html, /telcpremium\.com|app\.bundle_v|style_v=/);
assert.match(html, /src\/js\/telc\/app\.bundle\.js/);
assert.match(html, /src\/css\/telc-shell\.css/);
assert.match(boot, /pageshow/);
assert.match(boot, /event\.persisted/);
assert.match(boot, /serviceWorker\.getRegistrations/);
assert.match(runtime, /telc_session/);
assert.match(runtime, /window\.fetch/);
assert.match(enhancements, /B1:\s*\{\s*total:\s*183/);
assert.match(enhancements, /B2:\s*\{\s*total:\s*273/);
assert.match(enhancements, /MutationObserver/);
assert.match(shellCss, /TELC Prüfungsstudio/);
assert.match(shellCss, /data-telc-view='dashboard'/);
assert.match(netlifyHeaders, /\/telc-exams(?:\r?\n)+\s+Cache-Control: no-store/);
assert.match(netlifyHeaders, /\/telc-exams\.html(?:\r?\n)+\s+Cache-Control: no-store/);

for (const path of [
  "src/js/telc/app.bundle.js",
  "src/js/telc/boot.js",
  "src/js/telc/runtime.js",
  "src/js/telc/enhancements.js",
  "src/css/telc-legacy.css",
  "src/css/telc-shell.css",
  "src/vendor/react-18.3.1.min.js",
  "src/vendor/react-dom-18.3.1.min.js",
]) {
  await access(new URL(path, new URL("../", import.meta.url)));
}

console.log(`PASS TELC integration verification in ${projectRoot}`);
