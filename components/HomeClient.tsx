// components/HomeClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ToolCard from "@/components/ToolCard";
import type { ToolEntry } from "@/lib/tools-data";
import { START_TOOLS_COUNT, MORE_TOOLS_STEP, START_CATEGORY_BLOCK_COUNT } from "@/lib/vars";

/* ---------- tiny helpers ---------- */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
function k(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function niceCategory(raw?: string) {
  const s = k(raw).trim();
  if (!s) return "Uncategorized";
  // turn "ai-tools" -> "AI Tools", "llm" -> "LLM"
  return s
    .split(/[-_/]/g)
    .map((w) => (w.toUpperCase() === "LLM" ? "LLM" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
function matchText(hay: string, needle: string) {
  if (!needle) return true;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

/* Use env theme: "light" forces light; anything else = follow site (auto) */
const THEME_MODE = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();
const forceLight = THEME_MODE === "light";

/* ---------- Component ---------- */
export default function HomeClient({
  tools,
}: {
  tools: ToolEntry[];
}) {
  // Localized label fn (no i18n; English only)
  const t = (s: string) => s;

  // Build category counts from tools
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tools) {
      const c = niceCategory((t as any).category);
      map.set(c, (map.get(c) || 0) + 1);
    }
    // Ensure stable order: by count desc, then name asc
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
  }, [tools]);

  // Search + category filter state
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(""); // empty = all
  const [showAllCats, setShowAllCats] = useState(false);

  // Derived filtered tools
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      // category filter
      if (selectedCategory) {
        const cat = niceCategory((tool as any).category);
        if (cat !== selectedCategory) return false;
      }
      if (!q) return true;

      // text search across key fields
      const hay = [
        (tool as any).name,
        (tool as any).description,
        (tool as any).category,
        (tool as any).key_differentiator,
        ((tool as any).best_for || []).join(" "),
        ((tool as any).pros || []).join(" "),
        ((tool as any).cons || []).join(" "),
      ]
        .map(k)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [tools, query, selectedCategory]);

  // Paging for tools
  const [visible, setVisible] = useState(START_TOOLS_COUNT || 90);
  useEffect(() => {
    // reset when filters change
    setVisible(START_TOOLS_COUNT || 90);
  }, [query, selectedCategory]);

  const canShowMore = visible < filtered.length;
  const shown = filtered.slice(0, visible);

  // Category list limits
  const primaryCats = categoryCounts.slice(0, 6);
  const moreCats = categoryCounts.slice(6);

  return (
    <div className="w-full">
      {/* Controls row: Search + Categories */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <label htmlFor="tool-search" className="sr-only">
                {t("Search tools")}
              </label>
              <input
                id="tool-search"
                type="search"
                placeholder={t("Search tools, features, categories…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cx(
                  "w-full rounded-lg border px-3 py-2 text-[15px] outline-none transition",
                  forceLight
                    ? "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-gray-500"
                    : "bg-white text-gray-900 border-gray-300 placeholder:text-gray-400 focus:border-gray-500 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
                )}
              />
            </div>
          </div>

          {/* Category chips */}
          {categoryCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* All */}
              <button
                type="button"
                onClick={() => setSelectedCategory("")}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                  selectedCategory === ""
                    ? forceLight
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-zinc-900 text-white border-zinc-900"
                    : forceLight
                    ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                )}
                title={t("Show all categories")}
              >
                {t("All")}
                <span
                  className={cx(
                    "ml-1 rounded-full px-1.5 py-[1px] text-[11px]",
                    forceLight ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                  )}
                >
                  {tools.length}
                </span>
              </button>

              {/* Primary (first 6) */}
              {primaryCats.map((c) => {
                const active = selectedCategory === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedCategory(active ? "" : c.name)}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                      active
                        ? forceLight
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-zinc-900 text-white border-zinc-900"
                        : forceLight
                        ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                        : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    )}
                    title={`${c.name} (${c.count})`}
                  >
                    {c.name}
                    <span
                      className={cx(
                        "ml-1 rounded-full px-1.5 py-[1px] text-[11px]",
                        forceLight ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                      )}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}

              {/* More toggle (if there are more categories) */}
              {moreCats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCats((v) => !v)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                    forceLight
                      ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                      : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  )}
                  aria-expanded={showAllCats}
                  aria-controls="more-categories-panel"
                >
                  {showAllCats ? t("Hide") : t("More")}
                </button>
              )}
            </div>
          )}

          {/* Expanded categories panel */}
          {showAllCats && moreCats.length > 0 && (
            <div
              id="more-categories-panel"
              className={cx(
                "rounded-xl border p-3 mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2",
                forceLight ? "bg-white border-gray-200" : "bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-800"
              )}
            >
              {moreCats.map((c) => {
                const active = selectedCategory === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedCategory(active ? "" : c.name)}
                    className={cx(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm border",
                      active
                        ? forceLight
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-zinc-900 text-white border-zinc-900"
                        : forceLight
                        ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                        : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    )}
                    title={`${c.name} (${c.count})`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span
                      className={cx(
                        "ml-2 rounded-full px-1.5 py-[1px] text-[11px]",
                        forceLight ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                      )}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tool grid */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 mt-4">
        {/* 3 columns on lg+, 2 on md, 1 on small */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {shown.map((tool) => (
            <ToolCard key={(tool as any).slug} tool={tool} />
          ))}
        </div>

        {/* More Tools */}
        {canShowMore && (
          <div className="flex justify-center my-6">
            <button
              type="button"
              onClick={() => setVisible((v) => v + (MORE_TOOLS_STEP || 90))}
              className={cx(
                "rounded-lg px-4 py-2 text-sm border",
                forceLight
                  ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
              )}
            >
              {t("More Tools")}
              <span className="ml-2 text-xs opacity-70">
                ({Math.min(visible + (MORE_TOOLS_STEP || 90), filtered.length)}/{filtered.length})
              </span>
            </button>
          </div>
        )}

        {/* Separator before category block preview at bottom (optional) */}
        {categoryCounts.length > 0 && (
          <div className="my-8">
            <div
              className={cx(
                "h-px w-full",
                forceLight ? "bg-gray-200" : "bg-gray-200 dark:bg-zinc-800"
              )}
            />
          </div>
        )}

        {/* Category block preview (bottom) limited by START_CATEGORY_BLOCK_COUNT */}
        {categoryCounts.length > 0 && (
          <div className="mb-10">
            <div className="mb-3 text-sm font-medium">
              {/* Title optional; keeping minimal per earlier requests */}
              {/* {t("Categories")} */}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {categoryCounts.slice(0, START_CATEGORY_BLOCK_COUNT || 30).map((c) => (
                <button
                  key={`bottom-${c.name}`}
                  type="button"
                  onClick={() => {
                    // Scroll to top and filter
                    setSelectedCategory(c.name);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={cx(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm border",
                    forceLight
                      ? "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                      : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  )}
                  title={`${c.name} (${c.count})`}
                >
                  <span className="truncate">{c.name}</span>
                  <span
                    className={cx(
                      "ml-2 rounded-full px-1.5 py-[1px] text-[11px]",
                      forceLight ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                    )}
                  >
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
