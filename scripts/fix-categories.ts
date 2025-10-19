// scripts/fix-categories.ts
// Usage:
//   pnpm tsx scripts/fix-categories.ts                 # dry-run (prints what would change)
//   pnpm tsx scripts/fix-categories.ts --write         # apply in-place
//   pnpm tsx scripts/fix-categories.ts --dir data/tools --write
//
// What it does:
// - Walks a directory of tool JSON files
// - Reads each file, looks at `categories` (string|string[])
// - Repairs split tokens: "/", "(RPA", "&", "Agents)" -> "RPA & Agents"
// - Splits groups on separators ("/", "|", "•"), preserves order, de-dupes
// - Keeps the first category as primary (order preserved)
// - Leaves already-good arrays alone

import fs from "node:fs";
import path from "node:path";

type ToolLike = Record<string, any>;

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return fallback;
  return v;
};

const DIR = path.resolve(process.cwd(), arg("--dir", "data/tools")!);
const WRITE = process.argv.includes("--write") || process.argv.includes("--apply");

// Treat these as separators between categories (group boundaries)
const SEP_TOKENS = new Set<string>(["/", "|", "•"]);

// Tokens that are “junk” by themselves
const JUNK_TOKENS = new Set<string>(["/", "&", "-", "—", "–", "•", "·", ","]);

// Simple title-case helper (keeps acronyms)
function titleCase(s: string): string {
  return s
    .split(/\s+/g)
    .map((w) => {
      if (!w) return w;
      if (w.toUpperCase() === w && w.length <= 4) return w; // keep acronyms like RPA, NLP
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/\s*&\s*/g, " & ");
}

// Returns true if array looks like it contains split/junk tokens
function looksBroken(arr: string[]): boolean {
  if (!arr.length) return false;
  return arr.some(
    (t) =>
      SEP_TOKENS.has(t.trim()) ||
      t.trim().startsWith("(") ||
      t.trim().endsWith(")") ||
      t.trim() === "&"
  );
}

// Core: merge split tokens into proper category phrases
function repairCategories(input: string[] | string | undefined): string[] {
  if (!input) return [];
  let tokens: string[] = Array.isArray(input) ? input.slice() : [String(input)];

  // If someone stored a single string with separators, split it defensively
  if (tokens.length === 1 && /[\/|•]/.test(tokens[0])) {
    tokens = tokens[0].split(/\s*([\/|•])\s*/g).filter((x) => x !== "");
  }

  tokens = tokens.map((t) => t.trim()).filter((t) => t !== "");

  // If array already looks clean (no split markers), just normalize spacing/casing lightly
  if (!looksBroken(tokens)) {
    const dedup = new Set<string>();
    const out: string[] = [];
    for (const t of tokens) {
      const clean = t.replace(/^\((.*)\)$/, "$1").replace(/\s+/g, " ").trim();
      if (!clean) continue;
      const tc = titleCase(clean);
      if (!dedup.has(tc.toLowerCase())) {
        dedup.add(tc.toLowerCase());
        out.push(tc);
      }
    }
    return out;
  }

  const results: string[] = [];
  let group: string[] = [];
  let parenDepth = 0;

  const flush = () => {
    if (!group.length) return;
    // Join group tokens into a phrase
    let phrase = group.join(" ").trim();
    // If group started/ended with parens, strip outermost pair
    phrase = phrase.replace(/^\((.*)\)$/, "$1").replace(/^\((.*)$/, "$1").replace(/^(.*)\)$/, "$1");
    // Collapse whitespace around &
    phrase = phrase.replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim();
    // Remove residual junk-only phrases
    if (!phrase || JUNK_TOKENS.has(phrase)) {
      group = [];
      return;
    }
    // Title case (keep acronyms)
    phrase = titleCase(phrase);

    results.push(phrase);
    group = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // If this is a separator between categories, finalize current group
    if (SEP_TOKENS.has(tok)) {
      flush();
      continue;
    }

    const opens = (tok.match(/\(/g) || []).length;
    const closes = (tok.match(/\)/g) || []).length;

    // If we see a new "(" and current group has content but not inside parens,
    // treat it as a *new* category rather than attached to the previous one.
    if (opens > 0 && parenDepth === 0 && group.length > 0) {
      flush();
    }

    // Append cleaned token into group:
    // - keep "&" as is when surrounded by words
    // - drop isolated junk tokens
    if (tok === "&") {
      // keep "&" only if there is context (we’ll collapse spaces later)
      if (group.length > 0 || (i + 1 < tokens.length && !SEP_TOKENS.has(tokens[i + 1]))) {
        group.push("&");
      }
    } else if (!JUNK_TOKENS.has(tok)) {
      group.push(tok);
    }

    parenDepth += opens;
    parenDepth -= closes;

    // If we just closed a parenthetical group completely, we can safely flush it
    if (parenDepth <= 0 && opens + closes > 0) {
      parenDepth = 0;
      flush();
    }
  }
  // Flush any trailing group
  flush();

  // De-dupe (case-insensitive) while preserving order
  const seen = new Set<string>();
  const finalOut: string[] = [];
  for (const c of results) {
    const key = c.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      finalOut.push(c);
    }
  }
  return finalOut;
}

function* walkJsonFiles(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkJsonFiles(full);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) {
      yield full;
    }
  }
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`✗ Directory not found: ${DIR}`);
    process.exit(1);
  }

  let changed = 0;
  let scanned = 0;

  for (const file of walkJsonFiles(DIR)) {
    try {
      scanned++;
      const raw = fs.readFileSync(file, "utf8");
      const data: ToolLike = JSON.parse(raw);

      const original = Array.isArray(data.categories)
        ? data.categories.slice()
        : typeof data.categories === "string"
        ? [data.categories]
        : [];

      const repaired = repairCategories(original);

      // If nothing to do, continue
      const same =
        repaired.length === original.length &&
        repaired.every((v, i) => String(v) === String(original[i]));

      if (same) continue;

      if (!WRITE) {
        console.log(`• ${path.relative(process.cwd(), file)}`);
        console.log(`   before: ${JSON.stringify(original)}`);
        console.log(`   after : ${JSON.stringify(repaired)}\n`);
      } else {
        // Write back with stable formatting
        const next = { ...data, categories: repaired };
        fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n", "utf8");
        console.log(`✓ fixed: ${path.relative(process.cwd(), file)}  -> ${JSON.stringify(repaired)}`);
        changed++;
      }
    } catch (err: any) {
      console.error(`! error reading ${file}: ${err?.message || err}`);
    }
  }

  console.log(`\nScanned ${scanned} file(s). ${WRITE ? `Changed ${changed}.` : "No files written (dry-run)."}\n`);
}

main();
