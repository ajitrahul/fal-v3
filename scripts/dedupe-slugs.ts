// scripts/dedupe-slugs.ts
// Node 18+ / TypeScript
// Usage examples:
//   npx tsx scripts/dedupe-slugs.ts --dir ./data/tools
//   npx tsx scripts/dedupe-slugs.ts --dir ./data/tools --remove ./data/tools_remove
//   npx tsx scripts/dedupe-slugs.ts --dir ./data/tools --dry-run

import fs from "fs/promises";
import path from "path";

type FileInfo = {
  filePath: string;
  size: number;
  mtimeMs: number;
};

type Args = {
  dir: string;          // directory to scan for JSON files
  removeDir: string;    // directory to move duplicates into
  dryRun: boolean;      // if true, only logs actions
  ext: string[];        // file extensions to include
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const getFlag = (name: string) => {
    const idx = argv.findIndex(a => a === name || a.startsWith(name + "="));
    if (idx === -1) return undefined;
    const val = argv[idx].includes("=") ? argv[idx].split("=")[1] : argv[idx + 1];
    return val;
  };

  const dir = getFlag("--dir") || "./data/tools";
  const removeDir = getFlag("--remove") || path.join(dir, "_removed");
  const dryRun = argv.includes("--dry-run");
  const extArg = getFlag("--ext");
  const ext = extArg ? extArg.split(",").map(s => s.trim().toLowerCase()) : [".json"];

  return { dir, removeDir, dryRun, ext };
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function isWithin(child: string, parent: string) {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function* walkFiles(rootDir: string, opts: { exclude?: string[], exts: string[] }) {
  const exclude = new Set((opts.exclude || []).map(p => path.resolve(p)));
  const stack: string[] = [path.resolve(rootDir)];

  while (stack.length) {
    const current = stack.pop()!;
    if ([...exclude].some(ex => current === ex || isWithin(current, ex))) continue;

    let entries: any[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if ([...exclude].some(ex => full === ex || isWithin(full, ex))) continue;

      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (opts.exts.includes(ext)) {
          yield full;
        }
      }
    }
  }
}

function sanitizeForFolder(name: string) {
  return String(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 100);
}

async function safeMove(from: string, to: string) {
  await ensureDir(path.dirname(to));
  try {
    await fs.rename(from, to);
  } catch (e: any) {
    // cross-device fallback
    if (e?.code === "EXDEV") {
      await fs.copyFile(from, to);
      await fs.unlink(from);
    } else {
      throw e;
    }
  }
}

async function main() {
  const { dir, removeDir, dryRun, ext } = parseArgs();

  const resolvedDir = path.resolve(dir);
  const resolvedRemoveDir = path.resolve(removeDir);

  if (resolvedDir === resolvedRemoveDir || isWithin(resolvedRemoveDir, resolvedDir)) {
    // We allow removeDir inside dir, but we will exclude it from scan below.
  }

  console.log(`\nDe-duping by slug:
  - Scan dir:     ${resolvedDir}
  - Remove dir:   ${resolvedRemoveDir}
  - Extensions:   ${ext.join(", ")}
  - Dry run:      ${dryRun ? "YES" : "NO"}\n`);

  const slugMap = new Map<string, FileInfo[]>();
  let scanned = 0;
  let noSlug = 0;
  let invalidJSON = 0;

  for await (const filePath of walkFiles(resolvedDir, { exclude: [resolvedRemoveDir], exts: ext })) {
    scanned++;
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      invalidJSON++;
      console.warn(`! Invalid JSON (skipped): ${path.relative(resolvedDir, filePath)}`);
      continue;
    }

    const slug = data?.slug;
    if (!slug || typeof slug !== "string" || !slug.trim()) {
      noSlug++;
      continue;
    }

    const st = await fs.stat(filePath);
    const info: FileInfo = { filePath, size: st.size, mtimeMs: st.mtimeMs };
    const arr = slugMap.get(slug) || [];
    arr.push(info);
    slugMap.set(slug, arr);
  }

  // Decide winners & moves
  let duplicateGroups = 0;
  let toMoveCount = 0;
  const moves: Array<{ from: string; to: string }> = [];

  for (const [slug, files] of slugMap.entries()) {
    if (files.length <= 1) continue;
    duplicateGroups++;

    // Sort: keep the largest; tie-break by newer mtime; then lexicographically
    const sorted = files.sort((a, b) => {
      if (b.size !== a.size) return b.size - a.size;
      if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
      return a.filePath.localeCompare(b.filePath);
    });

    const keeper = sorted[0];
    const losers = sorted.slice(1);

    console.log(`Slug "${slug}" has ${files.length} files -> KEEP: ${path.basename(keeper.filePath)} (${keeper.size} bytes)`);
    const slugFolder = sanitizeForFolder(slug);

    for (const f of losers) {
      const dest = path.join(resolvedRemoveDir, slugFolder, path.basename(f.filePath));
      moves.push({ from: f.filePath, to: dest });
      toMoveCount++;
    }
  }

  if (duplicateGroups === 0) {
    console.log("No duplicate slugs found. ✅");
  } else {
    console.log(`\nFound ${duplicateGroups} duplicate slug group(s). Files to move: ${toMoveCount}`);
  }

  if (dryRun) {
    if (moves.length) {
      console.log("\nDRY RUN — planned moves:");
      for (const m of moves) {
        console.log(`  MOVE ${path.relative(resolvedDir, m.from)}  ->  ${path.relative(resolvedDir, m.to)}`);
      }
    }
    console.log(`\nSummary:
  Files scanned:     ${scanned}
  Duplicates groups: ${duplicateGroups}
  Will move:         ${toMoveCount}
  Missing slug:      ${noSlug}
  Invalid JSON:      ${invalidJSON}\n`);
    return;
  }

  // Execute moves
  let movedOk = 0;
  for (const m of moves) {
    try {
      // Handle name collision at destination by appending a counter
      let finalDest = m.to;
      let counter = 1;
      const base = path.basename(m.to, path.extname(m.to));
      const extname = path.extname(m.to);
      while (true) {
        try {
          await fs.access(finalDest);
          // exists -> bump name
          finalDest = path.join(path.dirname(m.to), `${base}__dup${counter}${extname}`);
          counter++;
        } catch {
          // not exists -> good to move
          break;
        }
      }
      await safeMove(m.from, finalDest);
      movedOk++;
      console.log(`Moved: ${path.relative(resolvedDir, m.from)} -> ${path.relative(resolvedDir, finalDest)}`);
    } catch (e) {
      console.error(`Failed to move ${m.from}:`, e);
    }
  }

  console.log(`\nDone.
  Files scanned:     ${scanned}
  Duplicate groups:  ${duplicateGroups}
  Moved:             ${movedOk}/${toMoveCount}
  Missing slug:      ${noSlug}
  Invalid JSON:      ${invalidJSON}
  Removed to:        ${resolvedRemoveDir}\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
