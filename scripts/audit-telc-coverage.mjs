import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const modules = ["lesenTeil1", "lesenTeil2", "lesenTeil3"];

console.log("Local TELC Lesen coverage report");
for (const level of ["b1", "b2"]) {
  const local = JSON.parse(await readFile(new URL(`src/data/telc/${level}.json`, root), "utf8"));
  console.log(`\n${level.toUpperCase()}`);
  modules.forEach((module, index) => {
    const localCount = local.modules[module].length;
    console.log(`  Lesen Teil ${index + 1}: ${localCount} local exercises`);
  });
}

console.log("\nCounts describe the exercises currently bundled with this app.");
