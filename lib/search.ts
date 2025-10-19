// lib/search.ts
import type { Tool } from "./types";

export type SortKey = "relevance" | "newest" | "top_rated" | "free_first";
export type Filters = {
  q: string;
  category?: string;        // single category slug/name
  pricing?: string[];       // ["free","freemium","paid","open-source","contact"]
  platforms?: string[];     // ["Web","API",...]
  models?: string[];        // ["GPT-4o","Llama",...]
  tags?: string[];          // quick flags: ["open_source","no_signup","api","mobile"]
  languages?: string[];     // ["en","hi","es",...]
  verified?: boolean | null;
  launch_since?: string | null; // ISO date lower bound
};
export type SearchResult = { items: Tool[]; total: number };

const text = (s?: string) => (s || "").toLowerCase();

function score(tool: Tool, q: string): number {
  if (!q) return 0.0001; // when no query, keep stable but non-zero for sort weighting
  const hay = [
    tool.name,
    tool.tagline,
    tool.summary,
    ...(tool.categories || []),
    ...(tool.tasks || []),
    ...(tool.integrations || []),
  ]
    .join(" ")
    .toLowerCase();

  let sc = 0;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (hay.includes(w)) sc += 2;
  }
  if (text(tool.name).startsWith(words[0] || "")) sc += 4;
  if (text(tool.slug).includes(q)) sc += 2;
  return sc;
}

function passFilters(t: Tool, f: Filters): boolean {
  if (f.category && !(t.categories || []).map((x) => x.toLowerCase()).includes(f.category.toLowerCase())) {
    return false;
  }
  if (f.pricing?.length && !f.pricing.includes(t.pricing?.model || "")) return false;
  if (f.platforms?.length && !f.platforms.some((p) => (t.platforms || []).includes(p))) return false;
  if (f.models?.length && !f.models?.some((m) => (t.models || []).includes(m))) return false;
  if (f.languages?.length && !f.languages?.some((lng) => (t.languages || []).includes(lng))) return false;
  if (Array.isArray(f.tags) && f.tags.length) {
    for (const tag of f.tags) {
      if (tag === "open_source" && !t.flags?.open_source) return false;
      if (tag === "no_signup" && !t.flags?.no_signup) return false;
      if (tag === "api" && !t.flags?.api_available) return false;
      if (tag === "mobile" && !t.flags?.mobile_app) return false;
      if (tag === "on_device" && !t.flags?.on_device) return false;
    }
  }
  if (typeof f.verified === "boolean") {
    if ((t.flags?.verified ?? false) !== f.verified) return false;
  }
  if (f.launch_since) {
    const tdate = new Date(t.release_date || "1970-01-01").getTime();
    const bound = new Date(f.launch_since).getTime();
    if (Number.isFinite(bound) && tdate < bound) return false;
  }
  return true;
}

export function searchTools(all: Tool[], f: Filters, sort: SortKey): SearchResult {
  const q = f.q || "";
  const withScore = all
    .filter((t) => passFilters(t, f))
    .map((t) => ({ t, s: score(t, q) }));

  switch (sort) {
    case "newest":
      withScore.sort((a, b) => (b.t.release_date || "").localeCompare(a.t.release_date || ""));
      break;
    case "top_rated":
      withScore.sort(
        (a, b) =>
          (b.t.community?.rating || 0) - (a.t.community?.rating || 0) ||
          (b.t.community?.votes || 0) - (a.t.community?.votes || 0)
      );
      break;
    case "free_first":
      withScore.sort((a, b) => {
        const fa = a.t.pricing?.model === "free" ? 1 : 0;
        const fb = b.t.pricing?.model === "free" ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return (b.s || 0) - (a.s || 0);
      });
      break;
    default: // relevance
      withScore.sort((a, b) => (b.s || 0) - (a.s || 0));
  }

  return { items: withScore.map((x) => x.t), total: withScore.length };
}
