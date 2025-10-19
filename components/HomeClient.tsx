// components/HomeClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ToolCard from "@/components/ToolCard";
import type { ToolEntry } from "@/lib/tools-data";
import { START_TOOLS_COUNT, MORE_TOOLS_STEP, START_CATEGORY_BLOCK_COUNT } from "@/lib/vars";

/* ---------- tiny helpers ---------- */
function matchText(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}
function getStoredArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function focusSearch() {
  try {
    const el = document.getElementById("tool-search") as HTMLInputElement | null;
    el?.focus();
    el?.select?.();
  } catch {}
}
function isNewish(tool: ToolEntry) {
  const keys = ["added_at", "created_at", "first_seen", "release_date", "updated_at"];
  const now = Date.now();
  for (const k of keys) {
    const raw = (tool as any)?.[k];
    if (!raw) continue;
    const ts = Date.parse(raw);
    if (!Number.isNaN(ts)) {
      const days = (now - ts) / (1000 * 60 * 60 * 24);
      if (days <= 30) return true;
    }
  }
  return false;
}
function hasFree(t: ToolEntry) {
  const flags = (t as any).flags ?? {};
  if (flags.has_free_tier) return true;
  const plans = (t as any).pricing_plans;
  if (Array.isArray(plans)) {
    for (const p of plans) {
      const v = (p as any)?.price;
      if (v === 0 || v === "0" || String(v).toLowerCase() === "free") return true;
    }
  }
  return false;
}
function hasApi(t: ToolEntry) {
  const flags = (t as any).flags ?? {};
  return !!flags.has_api;
}
function isOpenSource(t: ToolEntry) {
  const flags = (t as any).flags ?? {};
  return !!flags.is_open_source;
}
function hasVideo(t: ToolEntry) {
  const a = (t as any).official_video;
  if (typeof a === "string" && /^https?:\/\//i.test(a.trim())) return true;
  const b = (t as any).tutorials_youtube;
  return Array.isArray(b) && !!b[0]?.url;
}

/* Category aliases -> readable text */
const CATEGORY_ALIASES: Record<string, string> = {
  "rag": "Retrieval-Augmented Generation",
  "vector db": "Vector Databases",
  "llm": "Large Language Models",
  "vision": "Computer Vision",
  "multimodal": "Multimodal AI",
  "agent": "Agents & Orchestration",
  "orchestration": "Agents & Orchestration",
  "automation": "Automation",
  "sdk": "SDKs",
  "developer tools": "Developer Tools",
  "speech": "Speech / Audio",
  "audio": "Speech / Audio",
  "voice": "Voice",
  "video": "Video AI",
  "search": "AI Search",
  "security": "Security & Compliance",
  "compliance": "Security & Compliance",
  "analytics": "Analytics",
  "platform": "AI Platforms",
};
function aliasCategory(raw?: string) {
  const key = String(raw || "").trim().toLowerCase();
  if (!key) return "Uncategorized";
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  return key.replace(/\b\w/g, (m) => m.toUpperCase());
}

/* Icons + one-liners for category tiles */
const Svg = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);

const CAT_META: Record<
  string,
  { icon: JSX.Element; blurb: string }
> = {
  "Retrieval-Augmented Generation": { icon: <Svg d="M3 5h18v2H3V5zm0 6h12v2H3v-2zm0 6h18v2H3v-2z" />, blurb: "Grounded answers with your data." },
  "Vector Databases": { icon: <Svg d="M12 3c-5 0-9 1.6-9 3.5S7 10 12 10s9-1.6 9-3.5S17 3 12 3zM21 9.5C21 11.4 17 13 12 13S3 11.4 3 9.5V13c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V9.5zM21 16c0 1.9-4 3.5-9 3.5S3 17.9 3 16v2c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V16z" />, blurb: "Store and search embeddings at scale." },
  "Large Language Models": { icon: <Svg d="M12 2a6 6 0 0 0-6 6v2H4a3 3 0 1 0 0 6h1.1A7 7 0 0 0 12 22a7 7 0 0 0 6.9-6H20a3 3 0 1 0 0-6h-2V8a6 6 0 0 0-6-6z" />, blurb: "General-purpose reasoning and text." },
  "Computer Vision": { icon: <Svg d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7zm0 4a3 3 0 1 0 0 6a3 3 0 0 0 0-6z" />, blurb: "Understand images and scenes." },
  "Multimodal AI": { icon: <Svg d="M3 4h18v6H3V4zm0 10h10v6H3v-6zm12 0h6v6h-6v-6z" />, blurb: "Combine text, image, audio, and video." },
  "Agents & Orchestration": { icon: <Svg d="M12 2l4 4-4 4-4-4 4-4zm7 9l3 3-3 3-3-3 3-3zM5 11l3 3-3 3-3-3 3-3z" />, blurb: "Multi-step automation with tools." },
  "Automation": { icon: <Svg d="M10 2h4v4h-4zM4 10h4v4H4zm12 0h4v4h-4zM10 18h4v4h-4z" />, blurb: "Workflows that run themselves." },
  "SDKs": { icon: <Svg d="M8.6 16.6 4 12l4.6-4.6L10 8.8 6.8 12 10 15.2zm6.8-9.2L20 12l-4.6 4.6L14 15.2 17.2 12 14 8.8z" />, blurb: "APIs and libraries for developers." },
  "Developer Tools": { icon: <Svg d="M4 4h16v12H4zm0 14h7v2H4zm9 0h7v2h-7z" />, blurb: "Build, test, and ship faster." },
  "Speech / Audio": { icon: <Svg d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM5 11a7 7 0 0 0 7 7v3h-2v-3a7 7 0 0 1-7-7h2z" />, blurb: "Transcribe and synthesize speech." },
  "Voice": { icon: <Svg d="M4 9h2v6H4zm14 0h2v6h-2zM9 5h2v14H9zm4 2h2v10h-2z" />, blurb: "Conversational voice interfaces." },
  "Video AI": { icon: <Svg d="M8 7h8v10H8zm8 3 5-3v10l-5-3V10z" />, blurb: "Generate and analyze video." },
  "AI Search": { icon: <Svg d="M15.5 14h-.7l-.3-.3A6 6 0 1 0 14 15.5l.3.3v.7l4.3 4.3 1.4-1.4L15.5 14z" />, blurb: "Semantic search over content." },
  "Security & Compliance": { icon: <Svg d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />, blurb: "Protect data and meet standards." },
  "Analytics": { icon: <Svg d="M3 3h2v18H3zm16 8h2v10h-2zM11 7h2v14h-2zM7 13h2v8H7z" />, blurb: "Measure, monitor, and optimize." },
  "AI Platforms": { icon: <Svg d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zM6 12h12v2H6z" />, blurb: "End-to-end AI infrastructure." },
  "Uncategorized": { icon: <Svg d="M4 4h16v4H4zm0 6h10v4H4zm0 6h16v4H4z" />, blurb: "General AI tools and utilities." },
};

/* Quick filters */
type QuickFilter = "all" | "new" | "free" | "api" | "open" | "video";

type Props = {
  tools: ToolEntry[];
};

export default function HomeClient({ tools }: Props) {
  /* ------- state ------- */
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAllCats, setShowAllCats] = useState(false); // (top chips)
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [quick, setQuick] = useState<QuickFilter>("all");

  // “More Tools” paging (multiples of MORE_TOOLS_STEP)
  const [visibleCount, setVisibleCount] = useState(START_TOOLS_COUNT);

  // read ?quick=, ?favorites=1, ?category= from URL once (deep link)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("quick") as QuickFilter | null;
      if (q && ["all", "new", "free", "api", "open", "video"].includes(q)) setQuick(q);
      if (sp.get("favorites") === "1") setOnlyFavs(true);
      const cat = sp.get("category");
      if (cat) setSelectedCategory(cat);
    } catch {}
  }, []);

  /* compare / favorites counts from localStorage */
  const [compareSet, setCompareSet] = useState<string[]>([]);
  const [favoriteSet, setFavoriteSet] = useState<string[]>([]);
  useEffect(() => {
    setCompareSet(getStoredArray("compareTools"));
    setFavoriteSet(getStoredArray("favorites"));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "compareTools") setCompareSet(getStoredArray("compareTools"));
      if (e.key === "favorites") setFavoriteSet(getStoredArray("favorites"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ------- derived: categories with counts ------- */
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tools) {
      const c = aliasCategory((t as any).category);
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [tools]);

  const TOP_CHIPS = 6; // top chips near the search bar
  const catsPrimary = categoryCounts.slice(0, TOP_CHIPS);
  const catsRest = categoryCounts.slice(TOP_CHIPS);
  const visibleCats = showAllCats ? categoryCounts : catsPrimary;

  /* ------- filtering ------- */
  const baseFiltered = useMemo(() => {
    let list = tools;

    if (selectedCategory !== "All") {
      list = list.filter((t) => aliasCategory((t as any).category) === selectedCategory);
    }

    if (onlyFavs && favoriteSet.length > 0) {
      const favs = new Set(favoriteSet);
      list = list.filter((t) => favs.has(String((t as any).slug)));
    } else if (onlyFavs) {
      list = [];
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) => {
        const name = String((t as any).name || "");
        const desc = String((t as any).description || "");
        const tags = Array.isArray((t as any).tags) ? (t as any).tags.join(" ") : "";
        return matchText(name, q) || matchText(desc, q) || (tags && matchText(tags, q));
      });
    }

    switch (quick) {
      case "new":
        list = list.filter(isNewish);
        break;
      case "free":
        list = list.filter(hasFree);
        break;
      case "api":
        list = list.filter(hasApi);
        break;
      case "open":
        list = list.filter(isOpenSource);
        break;
      case "video":
        list = list.filter(hasVideo);
        break;
      case "all":
      default:
        break;
    }

    return list;
  }, [tools, query, selectedCategory, onlyFavs, favoriteSet, quick]);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(START_TOOLS_COUNT);
  }, [query, selectedCategory, onlyFavs, quick]);

  const total = baseFiltered.length;
  const mainVisible = baseFiltered.slice(0, visibleCount);
  const remaining = Math.max(0, total - visibleCount);

  const canOpenCompare = compareSet.length >= 2;
  const compareHref = `/compare?tools=${encodeURIComponent(compareSet.join(","))}`;

  return (
    <main dir="ltr" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <h1 className="sr-only">AI Tools Directory</h1>

      {/* Header meta + CTAs */}
      <header className="pt-8 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-base text-gray-600 dark:text-zinc-400" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyFavs((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-base transition
                ${
                  onlyFavs
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800"
                }`}
              aria-pressed={onlyFavs}
              title="Show only favorites"
            >
              <span className={onlyFavs ? "text-rose-300" : "text-rose-500"}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 21s-6.2-4.35-8.4-7.1C1.6 11.3 2 8.5 4.2 7.1C6 6 8.3 6.6 9.6 8.1L12 10.8l2.4-2.7c1.3-1.5 3.6-2.1 5.4-1c2.2 1.4 2.6 4.2.6 6.8C18.2 16.65 12 21 12 21z"
                  />
                </svg>
              </span>
              Favorites
            </button>

            <Link
              href={canOpenCompare ? compareHref : "#"}
              onClick={(e) => {
                if (!canOpenCompare) e.preventDefault();
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-base transition
                ${
                  canOpenCompare
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800 cursor-not-allowed"
                }`}
              aria-disabled={!canOpenCompare}
              title={canOpenCompare ? "Open compare" : "Select at least 2 tools to compare"}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
              Compare
              <span className="ml-1 rounded-full border px-1.5 text-[11px] text-white/90 dark:text-zinc-100/90 border-white/40 dark:border-zinc-700">
                {compareSet.length}/3
              </span>
            </Link>

            <button
              type="button"
              onClick={focusSearch}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-base
                bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100
                dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800"
              title="Focus search (⌘K)"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79l4.25 4.25a1 1 0 0 0 1.42-1.42L15.5 14ZM10 14a4 4 0 1 1 0-8a4 4 0 0 1 0 8Z" />
              </svg>
              Search
              <span className="ml-1 rounded border px-1 text-[11px] text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
                ⌘K
              </span>
            </button>

            {(selectedCategory !== "All" || query.trim() || onlyFavs || quick !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedCategory("All");
                  setOnlyFavs(false);
                  setQuick("all");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-base text-gray-600 hover:text-gray-900
                  dark:text-zinc-400 dark:hover:text-zinc-200"
                title="Reset all filters"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="currentColor" d="M12 6v2H5v8h14V8h-7V6h9v12H3V6zM8 4h8v2H8z" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Horizontal quick menu */}
      <nav className="mb-4 border-b border-gray-200 dark:border-zinc-800">
        <div className="-mb-px flex gap-1 overflow-x-auto py-1">
          {([
            { key: "all", label: "All" },
            { key: "new", label: "New" },
            { key: "free", label: "Free Tier" },
            { key: "api", label: "Has API" },
            { key: "open", label: "Open Source" },
            { key: "video", label: "Has Video" },
          ] as { key: QuickFilter; label: string }[]).map((item) => {
            const active = quick === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setQuick(item.key)}
                className={`inline-flex items-center rounded-t-md border px-3 py-2 text-[13.5px] transition ${
                  active
                    ? "border-gray-300 border-b-white bg-white text-gray-900 dark:border-zinc-700 dark:border-b-zinc-950 dark:bg-zinc-950 dark:text-zinc-100"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900"
                }`}
                aria-current={active ? "page" : undefined}
                title={`Filter: ${item.label}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Search + Top category chips */}
      <section className="mb-6">
        <div className="mb-3">
          <label htmlFor="tool-search" className="sr-only">
            Search tools
          </label>
          <div className="relative max-w-xl">
            <input
              id="tool-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools, descriptions, or tags…"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-200 dark:focus:ring-zinc-200"
              autoComplete="off"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
              ⌘K
            </span>
          </div>
        </div>

        <Categories
          total={tools.length}
          categoryCounts={categoryCounts}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          showAllCats={showAllCats}
          setShowAllCats={setShowAllCats}
          TOP_N={TOP_CHIPS}
        />
      </section>

      {/* MAIN GRID — paged (starts with START_TOOLS_COUNT) */}
      <section aria-label="All tools" className="mb-6">
        {mainVisible.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-base text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
            No tools match your filters.
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [column-fill:_balance]">
            {mainVisible.map((t) => (
              <ToolCard key={(t as any).slug} tool={t} />
            ))}
          </div>
        )}

        {/* “More Tools:” separator + incremental paging */}
        {remaining > 0 && (
          <div className="my-8">
            <div className="relative my-6">
              <hr className="border-gray-300 dark:border-zinc-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white px-3 text-sm text-gray-600 dark:bg-zinc-950 dark:text-zinc-400">
                  More Tools:
                </span>
              </div>
            </div>

            {/* (Optional) A second grid appears as user loads more; or we simply extend visibleCount */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => Math.min(c + MORE_TOOLS_STEP, total))}
                className="btn-outline"
                title="Load more tools"
              >
                Load {Math.min(MORE_TOOLS_STEP, remaining)} more ({remaining} left)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Bottom separator before categories (no “Browse by Category” text) */}
      <div className="relative my-8">
        <hr className="border-gray-300 dark:border-zinc-700" />
      </div>

      {/* CATEGORIES BLOCKS (limit 30 + “More”) */}
      <section className="mb-10">
        <CategoryTiles
          categories={categoryCounts}
          limit={START_CATEGORY_BLOCK_COUNT}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </section>
    </main>
  );
}

/* ----- Top category chips near search ----- */
function Categories({
  total,
  categoryCounts,
  selectedCategory,
  setSelectedCategory,
  showAllCats,
  setShowAllCats,
  TOP_N,
}: {
  total: number;
  categoryCounts: { name: string; count: number }[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  showAllCats: boolean;
  setShowAllCats: (v: boolean) => void;
  TOP_N: number;
}) {
  const catsPrimary = categoryCounts.slice(0, TOP_N);
  const catsRest = categoryCounts.slice(TOP_N);
  const visibleCats = showAllCats ? categoryCounts : catsPrimary;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setSelectedCategory("All")}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13.5px] transition ${
          selectedCategory === "All"
            ? "bg-gray-900 text-white border-gray-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800"
        }`}
      >
        All
        <span className="ml-1 rounded-full bg-white/40 px-1.5 py-[1px] text-[10px] text-white dark:bg-black/20 dark:text-zinc-900">
          {total}
        </span>
      </button>

      {visibleCats.map((c) => (
        <button
          key={c.name}
          type="button"
          onClick={() => setSelectedCategory((prev) => (prev === c.name ? "All" : c.name))}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13.5px] transition ${
            selectedCategory === c.name
              ? "bg-gray-900 text-white border-gray-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800"
          }`}
          title={`Show ${c.name}`}
        >
          {c.name}
          <span className="ml-1 rounded-full bg-white/40 px-1.5 py-[1px] text-[10px] text-white dark:bg-black/20 dark:text-zinc-900">
            {c.count}
          </span>
        </button>
      ))}

      {catsRest.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAllCats((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13.5px] bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800"
          aria-expanded={showAllCats}
        >
          {showAllCats ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}

/* ----- Bottom Category Tiles (with icons + one-liners) ----- */
function CategoryTiles({
  categories,
  limit,
  selectedCategory,
  onSelect,
}: {
  categories: { name: string; count: number }[];
  limit: number;
  selectedCategory: string;
  onSelect: (v: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? categories : categories.slice(0, limit);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((c) => {
          const meta = CAT_META[c.name] ?? CAT_META["Uncategorized"];
          const active = selectedCategory === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelect(active ? "All" : c.name)}
              className={`card group flex flex-col items-start p-3 text-left transition ${
                active ? "ring-2 ring-gray-900 dark:ring-zinc-200" : "hover:shadow-md"
              }`}
              title={`Show ${c.name}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-zinc-200">{meta.icon}</span>
                <div className="font-medium text-gray-900 dark:text-zinc-100">{c.name}</div>
              </div>
              <div className="mt-1 text-[12.5px] text-gray-600 dark:text-zinc-400">{meta.blurb}</div>
              <div className="mt-2 rounded-full bg-gray-50 px-2 py-[2px] text-[11px] text-gray-700 dark:bg-zinc-900 dark:text-zinc-300">
                {c.count} tools
              </div>
            </button>
          );
        })}
      </div>

      {categories.length > limit && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="btn-outline"
            aria-expanded={showAll}
            title={showAll ? "Show fewer categories" : "Show all categories"}
          >
            {showAll ? "Less" : `More (${categories.length - limit})`}
          </button>
        </div>
      )}
    </div>
  );
}
