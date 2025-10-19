// lib/guided.ts
// Facet + filter utilities for tools, built on top of lib/data.
// Backend-only helpers; no UI change.

import { DB } from "@/lib/data";

export type Tool = (typeof DB)["tools"][number];

export type GuidedFilters = {
  q?: string;
  categories?: string[];
  tasks?: string[];
  roles?: string[];
  best_for?: string[];
  use_cases?: string[];
  models?: string[];
  languages?: string[];
  integrations?: string[];
  tags?: string[];
  pricing_model?: string[]; // from tool.pricing?.model
};

export type GuidedResultItem = {
  slug: string;
  name: string;
  tagline?: string;
  summary?: string;
  logo_url?: string | null;
  main_category?: string | null;
  subcategory?: string | null;
};

export type GuidedResponse = {
  total: number;
  items: GuidedResultItem[];
  facets: {
    categories: Array<{ value: string; count: number }>;
    tasks: Array<{ value: string; count: number }>;
    roles: Array<{ value: string; count: number }>;
    best_for: Array<{ value: string; count: number }>;
    use_cases: Array<{ value: string; count: number }>;
    models: Array<{ value: string; count: number }>;
    languages: Array<{ value: string; count: number }>;
    integrations: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
    pricing_model: Array<{ value: string; count: number }>;
  };
};

function asArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v
      .split(/[,\|]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function textMatch(tool: Tool, q: string): boolean {
  const needle = q.toLowerCase();
  const hay = [
    tool.name,
    (tool as any).tagline,
    (tool as any).summary,
    ...(Array.isArray((tool as any).features) ? (tool as any).features : []),
    ...(Array.isArray(tool.use_cases) ? tool.use_cases : []),
    ...(Array.isArray(tool.best_for) ? tool.best_for : []),
    (tool as any).main_category,
    (tool as any).subcategory,
    ...(Array.isArray((tool as any).tags) ? (tool as any).tags : []),
  ]
    .filter(Boolean)
    .join(" • ")
    .toLowerCase();

  return hay.includes(needle);
}

function toolCategories(tool: Tool): string[] {
  const arr = new Set<string>();
  const main = (tool as any).main_category;
  const sub = (tool as any).subcategory;
  const cats = (tool as any).categories;
  if (main) arr.add(String(main));
  if (sub) arr.add(String(sub));
  if (Array.isArray(cats)) cats.forEach((c) => c && arr.add(String(c)));
  return Array.from(arr);
}

function hasAnyIntersection(hay: string[] | undefined, needles: string[]): boolean {
  if (!needles.length) return true;
  const set = new Set((hay || []).map((x) => (x ? String(x) : "")).filter(Boolean));
  return needles.some((n) => set.has(n));
}

function normalizeFilterStrings(xs: string[] | undefined): string[] {
  return (xs || []).map((s) => s.trim()).filter(Boolean);
}

export function filterTools(
  filters: GuidedFilters,
  offset = 0,
  limit = 24
): { total: number; items: Tool[] } {
  const f = {
    q: (filters.q || "").trim(),
    categories: normalizeFilterStrings(filters.categories),
    tasks: normalizeFilterStrings(filters.tasks),
    roles: normalizeFilterStrings(filters.roles),
    best_for: normalizeFilterStrings(filters.best_for),
    use_cases: normalizeFilterStrings(filters.use_cases),
    models: normalizeFilterStrings(filters.models),
    languages: normalizeFilterStrings(filters.languages),
    integrations: normalizeFilterStrings(filters.integrations),
    tags: normalizeFilterStrings(filters.tags),
    pricing_model: normalizeFilterStrings(filters.pricing_model),
  };

  const all = DB.tools;
  const out: Tool[] = [];

  for (const t of all) {
    // text
    if (f.q && !textMatch(t, f.q)) continue;

    // facets
    if (!hasAnyIntersection(toolCategories(t), f.categories)) continue;
    if (!hasAnyIntersection((t as any).tasks, f.tasks)) continue;
    if (!hasAnyIntersection(((t as any).job_roles || (t as any).roles) as string[], f.roles)) continue;
    if (!hasAnyIntersection((t as any).best_for, f.best_for)) continue;
    if (!hasAnyIntersection((t as any).use_cases, f.use_cases)) continue;
    if (!hasAnyIntersection((t as any).models, f.models)) continue;
    if (!hasAnyIntersection((t as any).languages, f.languages)) continue;
    if (!hasAnyIntersection((t as any).integrations, f.integrations)) continue;
    if (!hasAnyIntersection((t as any).tags, f.tags)) continue;

    // pricing model
    const pm = ((t as any).pricing && (t as any).pricing.model)
      ? [String((t as any).pricing.model)]
      : [];
    if (!hasAnyIntersection(pm, f.pricing_model)) continue;

    out.push(t);
  }

  const total = out.length;
  const sliced = out.slice(offset, offset + limit);
  return { total, items: sliced };
}

function countValues(arr: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of arr) {
    if (!v) continue;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return m;
}

function toFacetArray(m: Map<string, number>): Array<{ value: string; count: number }> {
  return Array.from(m.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function getFacetOptions(): GuidedResponse["facets"] {
  const cats: string[] = [];
  const tasks: string[] = [];
  const roles: string[] = [];
  const best_for: string[] = [];
  const use_cases: string[] = [];
  const models: string[] = [];
  const languages: string[] = [];
  const integrations: string[] = [];
  const tags: string[] = [];
  const pricing: string[] = [];

  for (const t of DB.tools) {
    toolCategories(t).forEach((c) => cats.push(c));
    asArray((t as any).tasks).forEach((x) => tasks.push(x));
    asArray(((t as any).job_roles || (t as any).roles)).forEach((x) => roles.push(x));
    asArray((t as any).best_for).forEach((x) => best_for.push(x));
    asArray((t as any).use_cases).forEach((x) => use_cases.push(x));
    asArray((t as any).models).forEach((x) => models.push(x));
    asArray((t as any).languages).forEach((x) => languages.push(x));
    asArray((t as any).integrations).forEach((x) => integrations.push(x));
    asArray((t as any).tags).forEach((x) => tags.push(x));
    const pm = (t as any).pricing?.model ? String((t as any).pricing.model) : "";
    if (pm) pricing.push(pm);
  }

  return {
    categories: toFacetArray(countValues(cats)),
    tasks: toFacetArray(countValues(tasks)),
    roles: toFacetArray(countValues(roles)),
    best_for: toFacetArray(countValues(best_for)),
    use_cases: toFacetArray(countValues(use_cases)),
    models: toFacetArray(countValues(models)),
    languages: toFacetArray(countValues(languages)),
    integrations: toFacetArray(countValues(integrations)),
    tags: toFacetArray(countValues(tags)),
    pricing_model: toFacetArray(countValues(pricing)),
  };
}

export function mapResultItems(tools: Tool[]): GuidedResultItem[] {
  return tools.map((t) => ({
    slug: t.slug!,
    name: t.name!,
    tagline: (t as any).tagline,
    summary: (t as any).summary,
    logo_url: (t as any).logo_url,
    main_category: (t as any).main_category,
    subcategory: (t as any).subcategory,
  }));
}
