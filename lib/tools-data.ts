// lib/tools-data.ts
// Server-side helpers to read tool data from data/tools/*.json

import { readdir, readFile } from "fs/promises";
import path from "path";

export type ToolBrief = {
  slug: string;
  name?: string;
  category?: string;            // normalized single category for list views
  description?: string;
  website_url?: string;
  logo_url?: string;
  image?: string;
};

const TOOLS_DIR = path.join(process.cwd(), "data", "tools");

function pickCategory(obj: any): string {
  // Prefer string "category"; else first of string[] "categories"; else "Uncategorized"
  const c =
    (typeof obj?.category === "string" && obj.category) ||
    (Array.isArray(obj?.categories) && typeof obj.categories[0] === "string" && obj.categories[0]) ||
    "Uncategorized";
  return String(c);
}

/** List all slugs (filenames without .json) under data/tools */
export async function listToolSlugs(): Promise<string[]> {
  try {
    const files = await readdir(TOOLS_DIR);
    return files
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .map((f) => f.replace(/\.json$/i, ""));
  } catch {
    return [];
  }
}

/** Read a single tool JSON by slug. Returns the parsed object or null on error. */
export async function readTool(slug: string): Promise<any | null> {
  try {
    const raw = await readFile(path.join(TOOLS_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Read all tools, normalize category, and de-duplicate by slug/filename. */
export async function readAllTools(): Promise<ToolBrief[]> {
  let files: string[] = [];
  try {
    files = await readdir(TOOLS_DIR);
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const out: ToolBrief[] = [];

  for (const f of files) {
    if (!f.toLowerCase().endsWith(".json")) continue;

    const slug = f.replace(/\.json$/i, "");
    if (seen.has(slug)) {
      // Optional: console.warn(`[data] Duplicate slug skipped: ${slug}`);
      continue;
    }

    try {
      const raw = await readFile(path.join(TOOLS_DIR, f), "utf8");
      const obj = JSON.parse(raw);

      // Some files also contain a "slug" field; prefer filename for stability
      const normalized: ToolBrief = {
        slug,
        name: obj?.name,
        category: pickCategory(obj),
        description: obj?.description,
        website_url: obj?.website_url,
        logo_url: obj?.logo_url,
        image: obj?.image,
      };

      out.push(normalized);
      seen.add(slug);
    } catch {
      // skip malformed file; continue
    }
  }
  return out;
}

/** Compute category counts from normalized ToolBriefs. */
export function computeCategoryCounts(tools: ToolBrief[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tools) {
    const c = t.category || "Uncategorized";
    counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}
