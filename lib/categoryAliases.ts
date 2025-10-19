// lib/categoryAliases.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure this file exists: lib/taxonomy/categories.json
const taxonomyPath = join(__dirname, "taxonomy", "categories.json");
const TAXONOMY = JSON.parse(readFileSync(taxonomyPath, "utf8"));

export type CanonicalCategory = { slug: string; name: string };
export type ResolvedCategory = CanonicalCategory;

type Taxonomy = {
  categories: { slug: string; name: string; aliases?: string[] }[];
  stopwords?: string[];
  joiners?: string[];
  separators?: string[];
};

const data: Taxonomy = TAXONOMY as Taxonomy;

const STOPWORDS = new Set((data.stopwords ?? []).map((s) => s.toLowerCase().trim()));
const JOINERS = new Set((data.joiners ?? ["&"]).map((s) => s.toLowerCase().trim()));
const SEPARATORS = new Set((data.separators ?? ["/", "|", "•"]).map((s) => s.toLowerCase().trim()));

const ALIAS_INDEX = new Map<string, CanonicalCategory>();

for (const c of data.categories) {
  const canon: CanonicalCategory = { slug: c.slug, name: c.name };
  for (const a of c.aliases ?? []) ALIAS_INDEX.set(normalizeKey(a), canon);
  ALIAS_INDEX.set(normalizeKey(c.name), canon); // treat display name as alias too
}

function titleCaseKeepAcronyms(s: string): string {
  return s
    .split(/\s+/g)
    .map((w) => {
      if (!w) return w;
      if (w.length <= 4 && w.toUpperCase() === w) return w;
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\((.*?)\)/g, "$1")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Merge split tokens like ["(RPA", "&", "Agents)"] -> "RPA & Agents" */
export function mergeFragments(tokens: string[]): string[] {
  const JUNK = new Set<string>([",", "-", "—", "–", "·"]);
  const out: string[] = [];
  let buf: string[] = [];
  let paren = 0;

  const flush = () => {
    if (!buf.length) return;
    let phrase = buf.join(" ").trim();
    phrase = phrase.replace(/^\((.*)\)$/, "$1").replace(/^\((.*)$/, "$1").replace(/^(.*)\)$/, "$1");
    phrase = phrase.replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim();
    if (phrase && phrase !== "&") out.push(phrase);
    buf = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]?.trim();
    if (!t) continue;

    if (SEPARATORS.has(t)) {
      flush();
      continue;
    }

    const opens = (t.match(/\(/g) || []).length;
    const closes = (t.match(/\)/g) || []).length;

    if (t === "&" || JOINERS.has(t)) {
      if (buf.length) buf.push("&");
      continue;
    }

    if (!JUNK.has(t)) {
      if (opens > 0 && paren === 0 && buf.length > 0) flush();
      buf.push(t);
    }

    paren += opens - closes;

    if (paren <= 0 && (opens + closes > 0)) {
      paren = 0;
      flush();
    }
  }
  flush();
  return out;
}

/** Repair a raw categories array/string into clean phrases */
export function repairRawCategories(raw: string[] | string | undefined): string[] {
  if (!raw) return [];
  let tokens: string[] = Array.isArray(raw) ? raw.slice() : [String(raw)];
  if (tokens.length === 1 && /[\/|•]/.test(tokens[0])) {
    tokens = tokens[0].split(/\s*([\/|•])\s*/g).filter(Boolean);
  }
  tokens = tokens.map((t) => t.trim()).filter(Boolean);
  const looksBroken = tokens.some((t) => SEPARATORS.has(t) || t === "&" || /^\(|\)$/.test(t));
  if (!looksBroken) return tokens;
  return mergeFragments(tokens);
}

/** Resolve a single phrase -> canonical category (alias match or new canonical) */
export function resolveCategoryPhrase(phrase: string): ResolvedCategory {
  const key = normalizeKey(phrase);
  const hit = ALIAS_INDEX.get(key);
  if (hit) return hit;

  const name = titleCaseKeepAcronyms(phrase);
  const slug = slugify(name);
  return { name, slug };
}

/** Normalize an input categories value -> ordered, de-duped canonical categories */
export function normalizeCategories(raw: string[] | string | undefined): ResolvedCategory[] {
  const repaired = repairRawCategories(raw);
  const out: ResolvedCategory[] = [];
  const seen = new Set<string>();

  for (const frag of repaired) {
    const cleaned = frag
      .split(/\s+/g)
      .filter((w) => !STOPWORDS.has(w.toLowerCase()))
      .join(" ")
      .trim();
    if (!cleaned) continue;

    const canon = resolveCategoryPhrase(cleaned);
    const key = `${canon.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(canon);
    }
  }
  return out;
}
