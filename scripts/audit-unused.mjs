// scripts/audit-unused.mjs
// Static analysis for likely-unused files in a Next.js (app-dir) project.
// It builds a graph of imports from entry points and marks anything not reachable
// as "unused candidates". Public assets are considered "used" if their name or
// "/public/..." path is found anywhere in code/text files.
//
// Usage:
//   node scripts/audit-unused.mjs
//
// Output:
//   - scripts/unused-files.json (array of file paths relative to project root)
//   - scripts/unused-files.csv
//
// Note:
//   This is conservative. It won’t follow dynamic, runtime-only references.
//   Always review the output before moving files.

import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);
const DATA_EXTS = new Set([".json", ".yml", ".yaml", ".csv"]);
const ASSET_EXTS = new Set([
  ".css", ".scss", ".sass",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
  ".webp", ".avif", ".mp4", ".mov",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pdf", ".md", ".txt"
]);

const TEXT_LIKE = new Set([...CODE_EXTS, ".css", ".json", ".md", ".txt", ".html"]);

const ALWAYS_KEEP = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "README.md",
  "readme.md",
  ".gitignore",
  ".npmrc",
  "tsconfig.json",
  "jsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "postcss.config.js",
  "tailwind.config.js",
]);

const isFile = (p) => {
  try { return fs.statSync(p).isFile(); } catch { return false; }
};
const isDir = (p) => {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
};
const readText = (p) => {
  try { return fs.readFileSync(p, "utf-8"); } catch { return ""; }
};

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (isDir(p)) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function rel(p) { return path.relative(PROJECT_ROOT, p).replace(/\\/g, "/"); }

function loadPackage() {
  const pkgPath = path.join(PROJECT_ROOT, "package.json");
  if (!isFile(pkgPath)) return {};
  try { return JSON.parse(readText(pkgPath)); }
  catch { return {}; }
}

function looksLikeAppEntry(relPath) {
  const base = path.basename(relPath).toLowerCase();
  if (!relPath.startsWith("app/")) return false;
  return ["page.tsx","page.jsx","layout.tsx","layout.jsx",
          "route.ts","route.js",
          "sitemap.ts","sitemap.js","sitemap.xml.ts","sitemap.xml.js",
          "robots.txt.ts","robots.txt.js"].includes(base);
}

// naive import/require/dynamic-import finder
const importRe = /(?:import\s+(?:.+?\s+from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\))/g;

function resolveImport(fromFile, spec) {
  // ignore bare packages
  if (!spec.startsWith(".") && !spec.startsWith("/") && !spec.startsWith("@/")) return null;

  let cand;
  if (spec.startsWith("@/")) cand = path.join(PROJECT_ROOT, spec.slice(2));
  else if (spec.startsWith("/")) cand = path.join(PROJECT_ROOT, spec.slice(1));
  else cand = path.join(path.dirname(fromFile), spec);

  const candidates = [cand];
  for (const ext of [".ts",".tsx",".js",".jsx",".cjs",".mjs",".json",".css"]) {
    candidates.push(cand + ext);
  }
  for (const ext of [".ts",".tsx",".js",".jsx",".cjs",".mjs",".json",".css"]) {
    candidates.push(path.join(cand, "index"+ext));
  }
  for (const c of candidates) {
    if (isFile(c)) return c;
  }
  return null;
}

function buildGraph(allCodeLike) {
  const graph = new Map();  // node -> Set(deps)
  for (const f of allCodeLike) {
    const deps = new Set();
    const text = readText(f);
    if (!text) { graph.set(f, deps); continue; }

    // CSS @import
    if (path.extname(f).toLowerCase() === ".css") {
      const cssRe = /@import\s+["']([^"']+)["']/g;
      let m; while ((m = cssRe.exec(text))) {
        const spec = m[1];
        const resolved = resolveImport(f, spec);
        if (resolved) deps.add(resolved);
      }
    }

    let m;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(text))) {
      const spec = m[1] || m[2] || m[3];
      if (!spec) continue;
      const resolved = resolveImport(f, spec);
      if (resolved) deps.add(resolved);
    }
    graph.set(f, deps);
  }
  return graph;
}

function main() {
  const pkg = loadPackage();

  // collect all files
  const allPaths = walk(PROJECT_ROOT)
    .filter(p => !rel(p).startsWith("node_modules/") && !rel(p).startsWith(".next/"));

  // pick code/data/css files we’ll consider for reachability
  const consider = allPaths.filter(p => {
    const ext = path.extname(p).toLowerCase();
    return CODE_EXTS.has(ext) || DATA_EXTS.has(ext) || ext === ".css";
  });

  // Compute roots:
  const roots = new Set();
  for (const p of consider) {
    const rp = rel(p);
    if (looksLikeAppEntry(rp)) roots.add(p);
  }
  for (const keep of ALWAYS_KEEP) {
    const p = path.join(PROJECT_ROOT, keep);
    if (isFile(p)) roots.add(p);
  }
  // scripts referenced in package.json
  const scripts = (pkg.scripts || {});
  for (const cmd of Object.values(scripts)) {
    const toks = String(cmd).replace(/\\/g,"/").match(/(?:node\s+)?(scripts\/[A-Za-z0-9._\-\/]+)/g);
    if (toks) {
      for (const t of toks) {
        const m = t.replace(/^node\s+/,"");
        const ab = path.join(PROJECT_ROOT, m);
        if (isFile(ab)) roots.add(ab);
      }
    }
  }

  // build dependency graph
  const graph = buildGraph(consider);

  // reachability
  const reachable = new Set();
  const queue = [...roots];
  while (queue.length) {
    const cur = queue.shift();
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    const deps = graph.get(cur);
    if (deps) for (const d of deps) if (!reachable.has(d)) queue.push(d);
  }

  // public assets check: mark "used" if name or "/public/..." string appears in any text-like file
  const publicDir = path.join(PROJECT_ROOT, "public");
  const publicFiles = isDir(publicDir) ? walk(publicDir).filter(isFile) : [];
  const textFiles = allPaths.filter(p => TEXT_LIKE.has(path.extname(p).toLowerCase()));
  const textCorpus = textFiles.map(p => [p, readText(p)]);

  const referencedPublic = new Set();
  for (const pf of publicFiles) {
    const relPublic = rel(pf);
    const webRef = "/"+relPublic.replace(/^public\//,"");
    const short = path.basename(pf);
    let found = false;
    for (const [,content] of textCorpus) {
      if (!content) continue;
      if (content.includes(webRef) || content.includes(short)) { found = true; break; }
    }
    if (found) referencedPublic.add(pf);
  }

  // decide unused
  const unused = [];
  for (const p of allPaths) {
    const rp = rel(p);
    const base = path.basename(p).toLowerCase();
    if (ALWAYS_KEEP.has(base)) continue;
    if (rp.startsWith("node_modules/") || rp.startsWith(".next/")) continue;

    if (p.startsWith(publicDir)) {
      if (!referencedPublic.has(p)) unused.append?.(rp) ?? unused.push(rp);
      continue;
    }

    const ext = path.extname(p).toLowerCase();
    if (CODE_EXTS.has(ext) || DATA_EXTS.has(ext) || ext === ".css") {
      if (!reachable.has(p)) unused.push(rp);
    }
  }

  // Save results
  const outDir = path.join(PROJECT_ROOT, "scripts");
  if (!isDir(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "unused-files.json");
  const csvPath  = path.join(outDir, "unused-files.csv");

  fs.writeFileSync(jsonPath, JSON.stringify(unused.sort(), null, 2), "utf-8");
  fs.writeFileSync(csvPath, ["path", ...unused.sort()].join("\n"), "utf-8");

  console.log("✅ Analysis complete");
  console.log("Project root:", PROJECT_ROOT);
  console.log("Reachable nodes:", reachable.size);
  console.log("Unused candidates:", unused.length);
  console.log("->", jsonPath);
  console.log("->", csvPath);
}

main();
