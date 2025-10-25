// components/NewsHeadlines.tsx
"use client";

import { useMemo } from "react";

export type HeadlineItem = {
  id: string;
  title: string;
  link: string;
  isoDate?: string;
  source?: string;
  imageUrl?: string; // ignored (no media)
  videoUrl?: string; // optional: shows a small text badge (no thumbnail)
};

/* ---------------- helpers ---------------- */
function ellipsize(s: string, max = 100) {
  if (!s) return s;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
function formatRel(iso?: string) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function faviconOf(link: string) {
  const host = hostOf(link);
  return host ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}` : "";
}

/* ---------------- component ---------------- */
export default function NewsHeadlines({ items }: { items: HeadlineItem[] }) {
  const top = useMemo(() => (items || []).slice(0, 8), [items]);
  if (!top.length) return null;

  return (
    <section
      aria-label="Top headlines"
      className="mb-8 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur
                 dark:border-zinc-800 dark:bg-zinc-900/70"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Top Headlines</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-zinc-800" />
      </div>

      {/* Clean, media-less cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {top.map((n) => {
          const rel = formatRel(n.isoDate);
          const fav = faviconOf(n.link);
          const host = hostOf(n.link);

          return (
            <a
              key={n.id}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-gray-200 bg-white p-3 transition hover:-translate-y-[1px] hover:bg-gray-50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              title={n.title}
            >
              <h3 className="line-clamp-2 text-[15px] leading-snug text-gray-900 group-hover:underline dark:text-zinc-100">
                {ellipsize(n.title, 100)}
              </h3>

              <div className="mt-2 flex items-center gap-2 text-[12px] text-gray-600 dark:text-zinc-400">
                {fav ? (
                  <img
                    src={fav}
                    alt=""
                    className="h-4 w-4 rounded-sm ring-1 ring-gray-200 dark:ring-zinc-700"
                    loading="lazy"
                  />
                ) : null}
                <span className="truncate">{n.source || host || "Source"}</span>
                {rel && <span className="opacity-70">· {rel}</span>}
                {n.videoUrl && (
                  <span className="ml-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-[1px] text-[10px] font-medium text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    Video
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
