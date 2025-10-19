// lib/search.ts
import { readAllTools, type ToolBrief } from "@/lib/tools-data";

export type QueryInput = {
  q?: string;
  categories?: string[];
  limit?: number;
  sort?: "name-asc" | "name-desc";
};

export type QueryResult = {
  tools: ToolBrief[];
  total: number;
  categoryCounts: Record<string, number>;
};

function norm(s?: string) {
  return String(s ?? "").toLowerCase().trim();
}

/** Server-side search over data/tools/*.json */
export async function queryTools(input: QueryInput = {}): Promise<QueryResult> {
  const { q = "", categories = [], limit, sort = "name-asc" } = input;

  const all = await readAllTools();

  // Build category counts from the whole corpus
  const categoryCounts: Record<string, number> = {};
  for (const t of all) {
    const c = String(t.category || "Uncategorized");
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  const qn = norm(q);
  const catSet = new Set(categories.map(norm));

  let out = all.filter((t) => {
    if (catSet.size > 0) {
      const tc = norm(t.category);
      if (!catSet.has(tc)) return false;
    }
    if (qn) {
      const hay = [t.name, t.category, t.description, t.website_url, t.slug]
        .map((x) => norm(x))
        .join(" ");
      if (!hay.includes(qn)) return false;
    }
    return true;
  });

  out.sort((a, b) => {
    const an = norm(a.name);
    const bn = norm(b.name);
    if (sort === "name-desc") return bn.localeCompare(an);
    return an.localeCompare(bn);
  });

  const limited =
    typeof limit === "number" && limit > 0 ? out.slice(0, limit) : out;

  return { tools: limited, total: out.length, categoryCounts };
}
