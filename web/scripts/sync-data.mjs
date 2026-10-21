// Copie data/*.json vers public/data/ (servis statiquement, mis en cache par le service worker).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
mkdirSync("public/data", { recursive: true });
if (existsSync("data"))
  for (const f of readdirSync("data").filter((f) => f.endsWith(".json"))) cpSync(`data/${f}`, `public/data/${f}`);
