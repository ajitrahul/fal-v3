// components/CompareTray.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * CompareTray
 * - Mirrors selection from localStorage key "compareTools"
 * - Shows on Home ("/") only
 * - Mobile-friendly sticky bar with safe-area padding
 * - Shows logo + name for each selected tool by scraping the visible cards in DOM
 * - Compare navigates to /compare?tools=... and then clears selection
 * - Clear button empties the selection immediately
 */
type Meta = { slug: string; name: string; logo?: string };

export default function CompareTray() {
  const router = useRouter();
  const pathname = usePathname();

  // ---- Hooks must always be called in the same order; no early return above this line ----
  const [slugs, setSlugs] = useState<string[]>([]);
  const [metaMap, setMetaMap] = useState<Record<string, Meta>>({});

  // Read from localStorage (kept in sync with ToolCard)
  const readSelection = () => {
    try {
      const raw = localStorage.getItem("compareTools");
      const arr = raw ? JSON.parse(raw) : [];
      setSlugs(Array.isArray(arr) ? arr.slice(0, 3) : []);
    } catch {
      setSlugs([]);
    }
  };

  // Initial read + subscribe to storage events + visibility changes
  useEffect(() => {
    readSelection();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "compareTools") readSelection();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") readSelection();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Try to scrape logo + name for each slug from visible DOM cards
  useEffect(() => {
    if (slugs.length === 0) return;
    const next: Record<string, Meta> = { ...metaMap };

    for (const slug of slugs) {
      if (next[slug]) continue;

      // Find a link to /tools/<slug>, then use the nearest <article> as the card container
      const link =
        (document.querySelector(`a[href="/tools/${slug}"]`) as HTMLAnchorElement | null) ||
        (document.querySelector(`a[href$="/tools/${slug}"]`) as HTMLAnchorElement | null);

      const card = link?.closest("article") as HTMLElement | null;

      // Name: prefer an <h2>, else link text, else slug
      let name =
        (card?.querySelector("h2")?.textContent || "").trim() ||
        (link?.textContent || "").trim() ||
        slug;

      // Logo: prefer the first <img> inside the card (typically the logo container), fallback none
      let logo =
        (card?.querySelector('img[src]') as HTMLImageElement | null)?.getAttribute("src") || undefined;

      // Normalize name (avoid super long strings)
      if (name.length > 80) name = name.slice(0, 77) + "…";

      next[slug] = { slug, name, logo };
    }

    setMetaMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs]); // re-run when slugs change

  const count = slugs.length;
  const showOnHome = pathname === "/";
  const disabled = count < 2;

  const query = useMemo(() => {
    if (!count) return "";
    return `/compare?tools=${encodeURIComponent(slugs.join(","))}`;
  }, [slugs, count]);

  function clearSelection() {
    try {
      localStorage.removeItem("compareTools");
      // broadcast change so ToolCard checkboxes untick immediately
      window.dispatchEvent(new StorageEvent("storage", { key: "compareTools", newValue: "[]" } as any));
    } catch {}
    setSlugs([]);
    setMetaMap({});
  }

  function onCompare() {
    if (disabled) {
      alert("Pick at least 2 tools to compare.");
      return;
    }
    // Navigate then clear (so selection is reset when you come back)
    router.push(query);
    setTimeout(clearSelection, 0);
  }

  // ---- Only hide via a guard AFTER all hooks are declared (fixes hook order errors) ----
  if (!showOnHome || count === 0) return null;

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-50",
        "px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2",
      ].join(" ")}
      aria-live="polite"
    >
      <div
        className={[
          "mx-auto max-w-6xl",
          "rounded-xl border shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/85",
          "bg-white dark:bg-zinc-900/90 dark:border-zinc-700",
          "px-3 py-2 sm:px-4 sm:py-3",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Selected items (logo + name) */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {slugs.map((slug) => {
                const m = metaMap[slug];
                const initials =
                  (m?.name || slug)
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || slug.slice(0, 2).toUpperCase();

                return (
                  <span
                    key={slug}
                    className="group max-w-[50vw] sm:max-w-[20rem] truncate rounded-full border px-2 py-0.5 text-xs
                               bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
                    title={m?.name || slug}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-sm ring-1 ring-gray-200 dark:ring-zinc-700">
                        {m?.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.logo}
                            alt={`${m.name || slug} logo`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-600 dark:text-zinc-300">
                            {initials}
                          </span>
                        )}
                      </span>
                      <span className="truncate">{m?.name || slug}</span>
                    </span>
                  </span>
                );
              })}
              <span className="ml-1 text-xs text-gray-600 dark:text-zinc-400">
                {count}/3 selected
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs
                         bg-white text-gray-700 border-gray-200 hover:bg-gray-50
                         dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onCompare}
              disabled={disabled}
              className={[
                "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium",
                disabled
                  ? "bg-gray-300 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
              ].join(" ")}
              title={disabled ? "Select at least 2 tools" : "Open comparison"}
            >
              Compare ({count})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
