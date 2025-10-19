// lib/data.ts
// Robust data loader for data/tools/*.json (per-file) with auto-refresh.
// Falls back to legacy data/tools.json if the folder is empty.
// - Lenient JSON parsing (strips comments/BOM/trailing commas)
// - Logs skipped files with reasons
// - Live Proxy export so DB.tools always reflects latest cache

import fs from "node:fs";
import path from "node:path";

type AnyObj = Record<string, any>;

export type DBShape = {
  tools: AnyObj[];
  categories: string[];
  bySlug: Map<string, AnyObj>;
};

let _DB: DBShape | null = null;
let _SIG: string | null = null;
let _LAST_CHECK = 0;
let _WATCHING = false;

const CHECK_INTERVAL_MS = Number(process.env.DATA_AUTO_REFRESH_MS || 2000);
const DATA_DIR = path.join(process.cwd(), "data");
const TOOLS_DIR = path.join(DATA_DIR, "tools");

/* ---------------- signature + watcher ---------------- */

function computeSignature(): string {
  const parts: string[] = [];

  if (fs.existsSync(TOOLS_DIR)) {
    const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.toLowerCase().endsWith(".json"));
    files.sort((a, b) => a.localeCompare(b));
    parts.push(`dir:${files.length}`);
    for (const fname of files) {
      try {
        const st = fs.statSync(path.join(TOOLS_DIR, fname));
        parts.push(`${fname}:${st.size}:${st.mtimeMs}`);
      } catch {
        // ignore
      }
    }
    if (parts.length > 1) return parts.join("|");
  }

  const legacy = path.join(DATA_DIR, "tools.json");
  if (fs.existsSync(legacy)) {
    try {
      const st = fs.statSync(legacy);
      return `legacy:${st.size}:${st.mtimeMs}`;
    } catch {}
  }

  return "empty";
}

function dropCache(reason = "unknown") {
  _DB = null;
  _SIG = null;
  _LAST_CHECK = 0;
  console.log(`[data] cache invalidated (${reason})`);
}

function ensureWatcher() {
  if (_WATCHING) return;
  try {
    if (fs.existsSync(TOOLS_DIR)) {
      fs.watch(TOOLS_DIR, { persistent: false }, () => dropCache("fs.watch"));
      _WATCHING = true;
      console.log("[data] watching data/tools for changes");
    } else if (fs.existsSync(DATA_DIR)) {
      fs.watch(DATA_DIR, { persistent: false }, () => {
        if (fs.existsSync(TOOLS_DIR)) {
          dropCache("tools-dir-created");
          ensureWatcher();
        }
      });
      _WATCHING = true;
      console.log("[data] watching data/ (waiting for tools/)");
    }
  } catch (e) {
    console.warn("[data] fs.watch not available in this runtime:", e);
  }
}
ensureWatcher();

function maybeAutoRefresh() {
  const now = Date.now();
  if (now - _LAST_CHECK < CHECK_INTERVAL_MS) return;
  _LAST_CHECK = now;

  const sig = computeSignature();
  if (_SIG === null) {
    _SIG = sig;
    return;
  }
  if (sig !== _SIG) {
    _SIG = sig;
    _DB = null;
    console.log("[data] signature changed → cache dropped");
  }
}

/* ---------------- helpers ---------------- */

function normalizeSlug(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function asArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string")
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
function uniqSorted(arr: string[]): string[] {
  const set = new Set(arr.map((x) => x.trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// strip BOM, // line comments, /* block comments */, and trailing commas
function sanitizeJsonText(text: string): string {
  let s = text.replace(/^\uFEFF/, "");
  // remove /* ... */ blocks
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // remove // ... line comments
  s = s.replace(/(^|\s)\/\/.*$/gm, "$1");
  // naive trailing comma removal (in arrays/objects)
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

function parseJsonLenient(filePath: string, text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(sanitizeJsonText(text));
    } catch (err) {
      console.warn(`[data] Invalid JSON in ${path.relative(process.cwd(), filePath)}:`, err);
      return undefined;
    }
  }
}

function loadPerFileTools(): AnyObj[] {
  if (!fs.existsSync(TOOLS_DIR)) return [];
  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.toLowerCase().endsWith(".json"));
  const out: AnyObj[] = [];
  for (const fname of files) {
    const full = path.join(TOOLS_DIR, fname);
    try {
      const raw = fs.readFileSync(full, "utf8");
      const obj = parseJsonLenient(full, raw);
      if (obj == null) {
        console.warn(`[data] Skipping ${fname} (parse failed)`);
        continue;
      }
      if (Array.isArray(obj)) {
        for (const t of obj) if (t && typeof t === "object") out.push(t);
      } else if (obj && typeof obj === "object") {
        out.push(obj);
      } else {
        console.warn(`[data] Skipping ${fname} (not an object/array)`);
      }
    } catch (err) {
      console.warn(`[data] Skipping ${fname} (read error):`, err);
    }
  }
  return out;
}

function loadLegacyMonolith(): AnyObj[] {
  const legacy = path.join(DATA_DIR, "tools.json");
  if (!fs.existsSync(legacy)) return [];
  try {
    const raw = fs.readFileSync(legacy, "utf8");
    const obj = parseJsonLenient(legacy, raw);
    if (Array.isArray(obj)) return obj;
    if (obj && Array.isArray((obj as any).tools)) return (obj as any).tools;
  } catch (e) {
    console.warn("[data] Failed parsing legacy tools.json:", e);
  }
  return [];
}

function buildDB(): DBShape {
  let tools = loadPerFileTools();
  if (tools.length === 0) tools = loadLegacyMonolith();

  const seen = new Set<string>();
  const cleaned: AnyObj[] = [];

  for (const t of tools) {
    if (!t || typeof t !== "object") continue;

    const name = (t as any).name || (t as any).title || "";
    let slug = (t as any).slug || (t as any).id || normalizeSlug(name);
    slug = normalizeSlug(slug);
    if (!slug) {
      console.warn("[data] Skipping record with no name/slug");
      continue;
    }

    const categories = asArray((t as any).categories).length
      ? asArray((t as any).categories)
      : uniqSorted(
          [(t as any).main_category, (t as any).subcategory]
            .map((x) => (x ? String(x) : ""))
            .filter(Boolean)
        );

    const rec: AnyObj = { ...t, id: slug, slug, name: name || slug, categories };

    if (!seen.has(slug)) {
      seen.add(slug);
      cleaned.push(rec);
    } else {
      console.warn(`[data] Duplicate slug skipped: ${slug}`);
    }
  }

  const catSet = new Set<string>();
  for (const t of cleaned) for (const c of asArray(t.categories)) catSet.add(c);
  const categories = Array.from(catSet).sort((a, b) => a.localeCompare(b));

  const bySlug = new Map<string, AnyObj>();
  for (const t of cleaned) bySlug.set(String(t.slug), t);

  console.log(`[data] Loaded tools: ${cleaned.length}, categories: ${categories.length}`);
  return { tools: cleaned, categories, bySlug };
}

/* ---------------- public API ---------------- */

export function getDB(): DBShape {
  maybeAutoRefresh();
  if (_DB) return _DB;
  _DB = buildDB();
  return _DB;
}

/** Live proxy so DB.tools / DB.categories always reflect latest cache. */
export const DB: DBShape = new Proxy({} as DBShape, {
  get(_t, prop) {
    const db = getDB();
    // @ts-ignore
    return db[prop];
  },
  ownKeys() {
    return Reflect.ownKeys(getDB());
  },
  getOwnPropertyDescriptor(_t, prop) {
    const desc = Object.getOwnPropertyDescriptor(getDB(), prop as any);
    if (desc) desc.configurable = true;
    return desc || { configurable: true, enumerable: true, writable: false, value: undefined };
  },
});

export function getToolBySlug(slug: string): AnyObj | undefined {
  return DB.bySlug.get(normalizeSlug(slug));
}

export function getSimilarTools(toolOrSlug: AnyObj | string, limit = 12): AnyObj[] {
  const base = typeof toolOrSlug === "string" ? getToolBySlug(toolOrSlug) : toolOrSlug;
  if (!base) return [];
  const baseCats = new Set(asArray(base.categories).map((c) => c.toLowerCase()));
  const baseMain = (base.main_category || "").toLowerCase();
  const baseSub = (base.subcategory || "").toLowerCase();
  const scored = DB.tools
    .filter((t) => t.slug !== base.slug)
    .map((t) => {
      const cats = asArray(t.categories).map((c) => c.toLowerCase());
      let score = cats.filter((c) => baseCats.has(c)).length;
      if (baseMain && String(t.main_category || "").toLowerCase() === baseMain) score += 1;
      if (baseSub && String(t.subcategory || "").toLowerCase() === baseSub) score += 0.5;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
  return scored;
}

export function __resetDBCache__() {
  dropCache("manual");
}

export function listCategories(): string[] {
  return DB.categories;
}
