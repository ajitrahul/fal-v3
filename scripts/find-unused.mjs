// scripts/find-unused.mjs
// Finds files not reachable from your Next.js entrypoints using esbuild's metafile.

import { build } from "esbuild";
import { globby } from "globby";            // <-- named export (not default)
import * as fs from "fs";
import fsp from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const SRC_DIRS = ["app", "components", "lib"]; // add others if needed

// Entry points: Next.js app router + API routes + special files
const ENTRY_GLOBS = [
  "app/**/page.{ts,tsx,js,jsx}",
  "app/**/layout.{ts,tsx,js,jsx}",
  "app/**/route.{ts,tsx,js,jsx}",
  "middleware.{ts,tsx,js,jsx}",
];

const ALL_CODE_GLOBS = [
  ...SRC_DIRS.map((d) => `${d}/**/*.{ts,tsx,js,jsx}`),
  "app/*.{ts,tsx,js,jsx}",
  "app/**/*.{ts,tsx,js,jsx}",
  "lib/**/*.{ts,tsx,js,jsx}",
  "components/**/*.{ts,tsx,js,jsx}",
];

function norm(p) {
  return p.split(path.sep).join("/");
}

(async () => {
  // 1) Gather entrypoints
  const entries = await globby(ENTRY_GLOBS, { gitignore: true, cwd: ROOT });
  const absEntries = entries.map((e) => path.join(ROOT, e));

  if (absEntries.length === 0) {
    console.error("No Next.js entrypoints found. Check ENTRY_GLOBS.");
    process.exit(1);
  }

  // 2) Bundle entries; we only need the metafile (dependency graph)
  const result = await build({
    entryPoints: absEntries,
    bundle: true,
    metafile: true,
    outdir: "node_modules/.unused-scan-tmp",
    platform: "node",
    format: "esm",
    treeShaking: true,
    sourcemap: false,
    logLevel: "silent",
    absWorkingDir: ROOT,
    tsconfig: "tsconfig.json",
  });

  const used = new Set(Object.keys(result.metafile.inputs).map(norm));

  // 3) All project code files
  const all = await globby(ALL_CODE_GLOBS, { gitignore: true, cwd: ROOT });
  const absAll = all.map((p) => norm(path.join(ROOT, p)));
  const candidate = absAll.filter((p) => !p.includes("/node_modules/"));

  // 4) Possibly unused = not in esbuild's reachable graph
  const unused = candidate.filter((p) => !used.has(p));

  console.log(`Entries analyzed: ${entries.length}`);
  console.log(`Reachable files: ${used.size}`);
  console.log(`Possibly unused files: ${unused.length}`);

  if (unused.length) {
    const rel = unused.map((p) => path.relative(ROOT, p)).sort();
    console.log(rel.join("\n"));

    if (process.argv.includes("--delete")) {
      // Safer than deleting: move to _archive/ (flat) so you can restore if needed
      const archiveDir = path.join(ROOT, "_archive");
      await fsp.mkdir(archiveDir, { recursive: true });
      for (const p of unused) {
        const relp = path.relative(ROOT, p);
        const dest = path.join(archiveDir, relp.replace(/[\\/]/g, "__"));
        await fsp.rename(p, dest).catch(async (e) => {
          // If rename across devices fails, fallback to copy+unlink
          const data = await fsp.readFile(p);
          await fsp.writeFile(dest, data);
          await fsp.unlink(p);
        });
        console.log(`moved ${relp} -> ${path.relative(ROOT, dest)}`);
      }
      console.log(`Moved ${unused.length} files into _archive/`);
    } else {
      console.log("\nTip: run with --delete to move unused files into _archive/ (safe).");
    }
  }
})();
