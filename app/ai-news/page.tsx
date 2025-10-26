// app/ai-news/page.tsx
import type { Metadata } from "next";
import { fetchNews, categorizeNews, type NewsItem } from "@/lib/ai-news-feeds";

export const metadata: Metadata = {
  title: "AI News",
  description: "Latest updates on AI tools, LLMs, and AI models (vendor sources).",
};

/* ----- config via env ----- */
const RECENT_DAYS =
  Number(process.env.NEWS_RECENT_DAYS || process.env.NEXT_PUBLIC_NEWS_RECENT_DAYS || 3);
const ARCHIVE_DAYS =
  Number(process.env.NEWS_ARCHIVE_DAYS || process.env.NEXT_PUBLIC_NEWS_ARCHIVE_DAYS || 30);
const MAX_PER_CATEGORY =
  Number(process.env.NEWS_MAX_PER_CATEGORY || process.env.NEXT_PUBLIC_NEWS_MAX_PER_CATEGORY || 20);

/* ----- helpers ----- */
function truncateTitle(s: string, max = 60) {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // No timezone suffix; short & readable
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type Bucketed = {
  tools: NewsItem[];
  llm: NewsItem[];
  models: NewsItem[];
  updates: NewsItem[];
};

function bucketByCategory(items: ReturnType<typeof categorizeNews>): Bucketed {
  const b: Bucketed = { tools: [], llm: [], models: [], updates: [] };
  for (const it of items) (b as any)[it.category].push(it);
  // sort newest → oldest; undated sink
  for (const k of Object.keys(b) as Array<keyof Bucketed>) {
    b[k].sort(
      (a, c) => (Date.parse(c.date || "") || 0) - (Date.parse(a.date || "") || 0)
    );
  }
  return b;
}

function Section({
  title,
  items,
  categoryParam,
  oldMode,
}: {
  title: string;
  items: NewsItem[];
  categoryParam: "tools" | "llm" | "models" | "updates";
  oldMode: boolean;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 mb-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
          {title}
          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-zinc-400">
            ({items.length})
          </span>
        </h2>

        {/* Old/Recent toggle link kept minimal; no extra files needed */}
        {oldMode ? (
          <a
            href={`/ai-news?category=${encodeURIComponent(categoryParam)}`}
            className="text-xs underline decoration-dotted text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Back to Recent
          </a>
        ) : (
          <a
            href={`/ai-news?old=1&category=${encodeURIComponent(categoryParam)}`}
            className="text-xs underline decoration-dotted text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Old News
          </a>
        )}
      </div>

      <div className="grid gap-2">
        {items.slice(0, MAX_PER_CATEGORY).map((n, i) => (
          <a
            key={`${n.source}-${i}-${n.url}`}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group rounded-lg border px-3 py-2 transition",
              "bg-white border-gray-200 hover:bg-gray-50",
              "dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[13.5px] sm:text-sm font-medium text-gray-900 group-hover:underline dark:text-zinc-100">
                {truncateTitle(n.title, 60)}
              </h3>
              <span className="shrink-0 text-[11px] text-gray-500 dark:text-zinc-400">
                {fmtDate(n.date)}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-gray-600 dark:text-zinc-400">
              {n.source}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function AiNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next 15: must await searchParams before use
  const sp = await searchParams;

  const oldMode = String(sp.old || "").trim() === "1";
  const categoryFilter = (Array.isArray(sp.category) ? sp.category[0] : sp.category) as
    | "tools"
    | "llm"
    | "models"
    | "updates"
    | undefined;

  const days = oldMode ? ARCHIVE_DAYS : RECENT_DAYS;
  const now = Date.now();
  const from = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now).toISOString();

  // Pull vendor news; categorized in code (tools / llm / models / updates)
  const items = await fetchNews({ from, to, limit: 600 }); // generous cap; trim per category
  const categorized = categorizeNews(items);
  const buckets = bucketByCategory(
    categoryFilter ? categorized.filter((i) => i.category === categoryFilter) : categorized
  );

  // Page header (minimal)
  const headerTitle = oldMode ? "AI News — Old" : "AI News";
  const headerNote = oldMode ? `Showing older posts from the last ${days} days.` : `Showing updates from the last ${days} day${days === 1 ? "" : "s"}.`;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="px-3 sm:px-4 mt-4 mb-4">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
          {headerTitle}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{headerNote}</p>
      </div>

      {/* Render sections only if they have items */}
      <Section title="AI Tools" items={buckets.tools} categoryParam="tools" oldMode={oldMode} />
      <Section title="LLM" items={buckets.llm} categoryParam="llm" oldMode={oldMode} />
      <Section title="AI Models" items={buckets.models} categoryParam="models" oldMode={oldMode} />
      <Section title="AI Updates" items={buckets.updates} categoryParam="updates" oldMode={oldMode} />
    </div>
  );
}
