// scripts/split-tools.mjs
// One-time helper to split data/tools.json into per-tool JSON files.
// Works with "type": "module" in package.json (ESM).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const MONO = path.join(DATA_DIR, "tools.json");
const OUT_DIR = path.join(DATA_DIR, "tools");

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const exists = await fs
    .stat(MONO)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    console.log("No data/tools.json found. Nothing to split.");
    return;
  }

  const raw = await fs.readFile(MONO, "utf8");
  let arr;
  try {
    const obj = JSON.parse(raw);
    arr = Array.isArray(obj) ? obj : Array.isArray(obj.tools) ? obj.tools : [];
  } catch (e) {
    console.error("Failed to parse data/tools.json:", e);
    process.exit(1);
  }

  if (!arr || arr.length === 0) {
    console.log("tools.json contains no tools. Nothing to split.");
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  for (const t of arr) {
    if (!t || typeof t !== "object") continue;
    const name = t.name || t.title || t.slug || t.id;
    const slug = slugify(t.slug || t.id || name);
    if (!slug) continue;

    // Ensure id/slug are consistent
    const tool = { ...t, id: slug, slug };

    const filePath = path.join(OUT_DIR, `${slug}.json`);
    await fs.writeFile(filePath, JSON.stringify(tool, null, 2), "utf8");
    written++;
  }

  console.log(`✅ Wrote ${written} files to data/tools/`);
  console.log("You can now remove data/tools.json if you wish.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
