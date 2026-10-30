import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(new URL(path, new URL("../", import.meta.url)), "utf8");

const html = await read("index.html");
const main = await read("script.js");
const telcApp = await read("src/js/telc-app.js");
const telcCss = await read("src/css/telc.css");
const b1 = JSON.parse(await read("src/data/telc/b1.json"));
const b2 = JSON.parse(await read("src/data/telc/b2.json"));
const netlifyHeaders = await read("_headers");
const redirects = await read("_redirects");

assert.match(html, /href="#\/telc"/);
assert.match(html, /id="telcView"/);
assert.match(html, /id="telcHeaderNav"/);
assert.match(html, /src\/css\/telc\.css/);
assert.match(main, /createTelcApp/);
assert.match(main, /parts\[0\] === "telc"/);
assert.match(telcApp, /deutschMira:telc:v1/);
assert.match(telcApp, /تصحيح الإجابات/);
assert.match(telcApp, /renderSimulation/);
assert.match(telcApp, /data-simulation-timer/);
assert.match(telcApp, /data-simulation-toggle/);
assert.match(telcApp, /pauseSimulation/);
assert.match(telcApp, /createConfirmationDialog/);
assert.match(telcApp, /data-telc-custom-select/);
assert.match(telcApp, /formatGapText/);
assert.match(telcApp, /data-telc-character/);
assert.match(telcApp, /telc-checkmark/);
assert.doesNotMatch(telcApp, /\bconfirm\(/);
assert.match(telcApp, /class="telc-level-card"[^>]+href=/);
assert.match(telcApp, /العودة للقائمة/);
assert.doesNotMatch(telcApp, /telcTopbar/);
assert.match(telcCss, /\.telc-workspace/);
assert.match(telcCss, /\.telc-simulation-plan/);
assert.match(telcCss, /bottom:\s*0/);
assert.match(netlifyHeaders, /\/src\/data\/telc\/\*/);
assert.match(redirects, /\/telc-exams\s+\/#\/telc\s+301/);

for (const [level, data] of [["B1", b1], ["B2", b2]]) {
  assert.equal(data.level, level);
  assert.equal(Object.keys(data.modules).length, 10);
  for (const [moduleName, exercises] of Object.entries(data.modules)) {
    assert.ok(exercises.length > 0, `${level} ${moduleName} must contain exercises`);
  }
}

for (const path of [
  "src/js/telc-app.js",
  "src/css/telc.css",
  "src/data/telc/b1.json",
  "src/data/telc/b2.json",
]) {
  await access(new URL(path, new URL("../", import.meta.url)));
}

for (const removedPath of [
  "telc exam/telc-exams.html",
  "src/js/telc/app.bundle.js",
  "src/js/telc/runtime.js",
  "src/js/telc/enhancements.js",
  "src/css/telc-legacy.css",
  "src/css/telc-shell.css",
]) {
  await assert.rejects(access(new URL(removedPath, new URL("../", import.meta.url))));
}

console.log(`PASS TELC integration verification in ${projectRoot}`);
