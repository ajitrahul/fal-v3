// lib/search.ts
import "server-only";
import { readAllTools, type ToolBrief } from "@/lib/tools-data";

export type QueryInput = {
  q?: string;                 // free-text
  categories?: string[];      // category filters (case-insensitive)
  limit?: number;             // cap results
  sort?: "name-asc" | "name-desc"; // simple sort
};

export type QueryResult = {
  tools: ToolBrief[];
  total: number;
  categoryCounts: Record<string, number>;
};

function norm(s?: string) {
  return String(s || "").toLowerCase().trim();
}

export async function queryTools(input: QueryInput = {}): Promise<QueryResult> {
  const { q = "", categories = [], limit, sort = "name-asc" } = input;

  // Load all tool briefs from data/tools/*.json
  const all = await readAllTools();

  // Build category counts (before filtering so the facet reflects the corpus)
  const categoryCounts: Record<string, number> = {};
  for (const t of all) {
    const c = String(t.category || "Uncategorized");
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  const qn = norm(q);
  const catSet = new Set(categories.map(norm));

  // Filter
  let out = all.filter((t) => {
    // category filter (if provided)
    if (catSet.size > 0) {
      const tc = norm(t.category);
      if (!catSet.has(tc)) return false;
    }
    // free text match across a few fields
    if (qn) {
      const hay = [
        t.name,
        t.category,
        t.description,
        t.website_url,
        t.slug,
      ]
        .map((x) => norm(x))
        .join(" ");
      if (!hay.includes(qn)) return false;
    }
    return true;
  });

  // Sort
  out.sort((a, b) => {
    const an = norm(a.name);
    const bn = norm(b.name);
    if (sort === "name-desc") return bn.localeCompare(an);
    return an.localeCompare(bn);
  });

  // Limit
  const limited = typeof limit === "number" && limit > 0 ? out.slice(0, limit) : out;

  return {
    tools: limited,
    total: out.length,
    categoryCounts,
  };
}
