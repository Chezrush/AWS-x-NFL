// Verifie que messages/fr.json et messages/en.json ont exactement les memes cles.
import { readFileSync } from "node:fs";
const keys = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const [fr, en] = ["fr", "en"].map((l) => new Set(keys(JSON.parse(readFileSync(`messages/${l}.json`, "utf8")))));
const diff = [...[...fr].filter((k) => !en.has(k)).map((k) => `manque dans en: ${k}`),
              ...[...en].filter((k) => !fr.has(k)).map((k) => `manque dans fr: ${k}`)];
if (diff.length) { console.error(diff.join("\n")); process.exit(1); }
console.log(`messages OK (${fr.size} cles)`);
