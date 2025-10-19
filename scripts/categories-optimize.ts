// scripts/categories-optimize.ts
// Run examples:
//   npx tsx scripts/categories-optimize.ts --dir data/tools          # dry-run
//   npx tsx scripts/categories-optimize.ts --dir data/tools --write  # apply
//
// IMPORTANT: use a *relative* import to lib here (no "@/lib").

import { promises as fs } from "node:fs";
import path from "node:path";
import { normalizeCategories } from "../lib/categoryAliases.js"; // ← relative; tsx resolves TS just fine

type Tool = Record<string, any>;

function getArg(name: string, fallback?: string) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return fallback;
  return v;
}

const ROOT = process.cwd();
const DIR = path.resolve(ROOT, getArg("--dir", "data/tools")!);
const WRITE = process.argv.includes("--write");

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) yield full;
  }
}

async function run() {
  try {
    await fs.access(DIR);
  } catch {
    console.error(`✗ Directory not found: ${DIR}`);
    process.exit(1);
  }

  let scanned = 0;
  let changed = 0;

  for await (const file of walk(DIR)) {
    scanned++;
    try {
      const raw = await fs.readFile(file, "utf8");
      const data: Tool = JSON.parse(raw);

      const original: string[] =
        Array.isArray(data.categories)
          ? data.categories.slice()
          : typeof data.categories === "string"
          ? [data.categories]
          : [];

      const normalized = normalizeCategories(original).map((c) => c.name);

      const same =
        normalized.length === original.length &&
        normalized.every((v, i) => String(v) === String(original[i]));

      if (same) continue;

      if (!WRITE) {
        console.log(`• ${path.relative(ROOT, file)}`);
        console.log(`  before: ${JSON.stringify(original)}`);
        console.log(`  after : ${JSON.stringify(normalized)}\n`);
      } else {
        const next = { ...data, categories: normalized };
        await fs.writeFile(file, JSON.stringify(next, null, 2) + "\n", "utf8");
        console.log(`✓ fixed: ${path.relative(ROOT, file)}  -> ${JSON.stringify(normalized)}`);
        changed++;
      }
    } catch (err: any) {
      console.error(`! error in ${path.relative(ROOT, file)}: ${err?.message || err}`);
    }
  }

  console.log(`\nScanned ${scanned} file(s). ${WRITE ? `Changed ${changed}.` : "No files written (dry-run)."}`);
}

run();
