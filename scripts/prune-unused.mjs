// scripts/prune-unused.mjs
// Reads scripts/unused-files.json (produced by scripts/audit-unused.mjs)
// and safely moves those files to .trash/unused-<timestamp>/ (dry-run by default).
//
// Usage:
//   1) node scripts/audit-unused.mjs
//   2) node scripts/prune-unused.mjs               # dry run (shows actions)
//   3) node scripts/prune-unused.mjs --apply       # actually move files to .trash
//   4) node scripts/prune-unused.mjs --purge       # PERMANENTLY DELETE (danger)
// Options:
//   --keep "<glob>"   : keep files matching a glob (can be repeated)
//   --only "<glob>"   : only act on files matching a glob (can be repeated)
//
// Notes:
// - We MOVE to .trash by default so you can restore if needed.
// - Protected files and folders are never touched.

import fs from "fs";
import path from "path";
import os from "os";

// Minimal glob matcher (supports * and ** for directories)
function globMatch(pattern, filePath) {
  const esc = s => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const reStr = "^" + esc(pattern)
    .replace(/\\\*\\\*/g, ".*")
    .replace(/\\\*/g, "[^/]*") + "$";
  return new RegExp(reStr).test(filePath.replace(/\\/g, "/"));
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); }
  catch { return null; }
}

const PROJECT_ROOT = process.cwd();
const UNUSED_LIST   = path.join(PROJECT_ROOT, "scripts", "unused-files.json");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const PURGE = args.includes("--purge"); // dangerous: permanent delete

function readMultiFlag(flag) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i+1]) out.push(args[i+1]);
  }
  return out;
}
const KEEPS = readMultiFlag("--keep");
const ONLYS = readMultiFlag("--only");

// Protect critical paths from accidental deletion
const PROTECT_PREFIXES = [
  ".trash/",
  ".git/",
  ".github/",
  ".next/",
  "node_modules/",
  "public/",
  "app/api/revalidate/",
  "scripts/",
  "tests/",
  "test-results/",
];

const PROTECT_FILES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "next.config.mjs",
  "tailwind.config.js",
  "postcss.config.js",
  "tsconfig.json",
  "vitest.config.ts",
  "playwright.config.ts",
  ".env",
  ".env.local",
  ".env.example",
]);

function isProtected(rel) {
  const u = rel.replace(/\\/g, "/");
  if (PROTECT_FILES.has(u)) return true;
  for (const p of PROTECT_PREFIXES) {
    if (u === p || u.startsWith(p)) return true;
  }
  return false;
}

function shouldKeepByGlobs(rel) {
  if (ONLYS.length > 0) {
    const ok = ONLYS.some(p => globMatch(p, rel));
    if (!ok) return true; // not in ONLY filter, so we keep it
  }
  if (KEEPS.length > 0 && KEEPS.some(p => globMatch(p, rel))) return true;
  return false;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function moveFileAbs(absFrom, absTo) {
  ensureDir(path.dirname(absTo));
  fs.renameSync(absFrom, absTo);
}

function removeFileAbs(absPath) {
  try { fs.rmSync(absPath, { force: true, recursive: false }); }
  catch (e) { console.error("  ! rm failed:", absPath, e?.message); }
}

function main() {
  const list = readJSON(UNUSED_LIST);
  if (!Array.isArray(list)) {
    console.error("Run 'node scripts/audit-unused.mjs' first. Missing:", UNUSED_LIST);
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const trashRoot = path.join(PROJECT_ROOT, ".trash", `unused-${stamp}`);

  console.log(APPLY ? "APPLY mode: files will be MOVED to .trash" :
                      (PURGE ? "PURGE mode: files will be permanently DELETED" :
                               "DRY RUN: no changes will be made"));
  if (ONLYS.length) console.log("ONLY filters:", ONLYS);
  if (KEEPS.length) console.log("KEEP filters:", KEEPS);
  console.log("");

  let total = 0, skipped = 0, protectedCount = 0;

  for (const rel of list) {
    const normRel = rel.replace(/^[./]+/, "").replace(/\\/g, "/");
    const absFrom = path.join(PROJECT_ROOT, normRel);

    if (!fs.existsSync(absFrom)) { 
      console.log("~ missing (skipping):", normRel);
      skipped++; 
      continue; 
    }

    if (isProtected(normRel) || shouldKeepByGlobs(normRel)) {
      console.log("• keep:", normRel);
      protectedCount++;
      continue;
    }

    total++;

    if (!APPLY && !PURGE) {
      console.log("⟶ would remove:", normRel);
      continue;
    }

    if (PURGE) {
      console.log("⟶ deleting:", normRel);
      removeFileAbs(absFrom);
    } else {
      const absTo = path.join(trashRoot, normRel);
      console.log("⟶ moving:", normRel, "→", path.relative(PROJECT_ROOT, absTo));
      ensureDir(path.dirname(absTo));
      moveFileAbs(absFrom, absTo);
    }
  }

  console.log("\nSummary:");
  console.log("  candidates:", list.length);
  console.log("  protected/kept:", protectedCount);
  console.log("  acted on:", total);
  console.log("  missing:", skipped);
  console.log("");
  if (!APPLY && !PURGE) {
    console.log("Nothing changed. Re-run with --apply to move to .trash or --purge to delete permanently.");
  }
}

main();
