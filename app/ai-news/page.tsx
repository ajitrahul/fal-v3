// app/ai-news/page.tsx
import Link from "next/link";
import {
  fetchNews,
  categorizeNews,
  type NewsItem,
  type NewsCategory,
} from "@/lib/ai-news-feeds";

/* -------------------------------------------
   Theme helpers (compatible with NEXT_PUBLIC_TOOLCARD_THEME)
   ------------------------------------------- */
function getTheme() {
  const mode = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();
  const forceLight = mode === "light";
  return {
    forceLight,
    pageBg: forceLight ? "bg-white" : "bg-white dark:bg-zinc-950",
    textPrimary: forceLight ? "text-gray-900" : "text-gray-900 dark:text-zinc-100",
    textSecondary: forceLight ? "text-gray-600" : "text-gray-600 dark:text-zinc-400",
    borderSoft: forceLight ? "border-gray-200" : "border-gray-200 dark:border-zinc-800",
    card: forceLight
      ? "bg-white border-gray-200"
      : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800",
    chip: forceLight
      ? "bg-gray-100 text-gray-700"
      : "bg-zinc-800 text-zinc-300",
    btnPrimary:
      forceLight
        ? "bg-gray-900 text-white hover:bg-gray-800"
        : "dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 bg-gray-900 text-white hover:bg-gray-800",
    input:
      forceLight
        ? "border-gray-300 bg-white text-gray-900"
        : "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 border-gray-300 bg-white text-gray-900",
  };
}

/* -------------------------------------------
   Small utilities
   ------------------------------------------- */
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function daysAgoISO(days: number) {
  const now = Date.now();
  const t = new Date(now - Math.max(1, days) * 24 * 60 * 60 * 1000);
  return t.toISOString();
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/* -------------------------------------------
   Category accent styles & icons
   ------------------------------------------- */
const CAT_ACCENT: Record<NewsCategory, { bar: string; chip: string; icon: string }> = {
  tools:   { bar: "bg-amber-500",  chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200",  icon: "M3 12h18v2H3zM3 6h14v2H3zM3 18h10v2H3z" },
  llm:     { bar: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/25 dark:text-indigo-200", icon: "M12 4a8 8 0 100 16 8 8 0 000-16zm1 11H8v-2h5v2zm3-4H8V9h8v2z" },
  models:  { bar: "bg-teal-500",   chip: "bg-teal-100 text-teal-800 dark:bg-teal-900/25 dark:text-teal-200",     icon: "M12 2l9 5v10l-9 5-9-5V7l9-5zm0 2.2L5 7v8l7 3.8 7-3.8V7l-7-2.8z" },
  updates: { bar: "bg-rose-500",   chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/25 dark:text-rose-200",     icon: "M13 7h-2v6h6v-2h-4V7zm-1-5a10 10 0 100 20 10 10 0 000-20z" },
};

function CatIcon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d={d} />
    </svg>
  );
}

/* -------------------------------------------
   News Card
   ------------------------------------------- */
function NewsCard({ it }: { it: NewsItem }) {
  const theme = getTheme();
  return (
    <li
      className={[
        "group overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md",
        theme.card,
      ].join(" ")}
    >
      {/* Optional media (only when feed provides it) */}
      {it.media?.url && it.media.type === "image" && (
        <div className={["relative w-full overflow-hidden border-b", theme.borderSoft].join(" ")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={it.media.url}
            alt=""
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      )}
      {it.media?.url && it.media.type === "video" && (
        <div className={["relative w-full overflow-hidden border-b", theme.borderSoft].join(" ")}>
          <video className="h-40 w-full object-cover" src={it.media.url} muted playsInline controls />
        </div>
      )}

      <div className="p-3">
        <Link href={it.url} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className={["text-[15px] font-semibold leading-snug", theme.textPrimary].join(" ")}>
            {truncate(it.title, 120)}
          </h3>
        </Link>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={["truncate", theme.textSecondary].join(" ")}>{it.source}</span>
          <time className={theme.textSecondary} dateTime={it.date}>
            {fmtDate(it.date)}
          </time>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------
   Section wrapper
   ------------------------------------------- */
function Section({
  category,
  title,
  items,
  cap,
  moreHref,
}: {
  category: NewsCategory;
  title: string;
  items: Array<NewsItem & { category: NewsCategory }>;
  cap?: number;
  moreHref?: string;
}) {
  const theme = getTheme();
  if (!items || items.length === 0) return null; // hide empty categories
  const list = typeof cap === "number" ? items.slice(0, cap) : items;
  const acc = CAT_ACCENT[category];

  return (
    <section className="mb-9">
      {/* Section header with accent */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className={["h-2 w-2 rounded-full", acc.bar].join(" ")} aria-hidden="true" />
          <h2 className={["truncate text-base font-semibold", theme.textPrimary].join(" ")} title={title}>
            {title}
          </h2>
          <span className={["ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", acc.chip].join(" ")}>
            <CatIcon d={acc.icon} className="h-3.5 w-3.5" />
            <span>Latest</span>
          </span>
        </div>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            title="View older posts for this category"
          >
            Old News
          </Link>
        )}
      </div>

      {/* Cards */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((it) => (
          <NewsCard key={`${it.source}-${it.url}`} it={it} />
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------
   Page (Server Component)
   ------------------------------------------- */
export default async function AiNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const theme = getTheme();
  const sp = await searchParams;

  const q          = (Array.isArray(sp?.q)    ? sp?.q[0]    : sp?.q)    || "";
  const fromParam  = (Array.isArray(sp?.from) ? sp?.from[0] : sp?.from) || undefined;
  const toParam    = (Array.isArray(sp?.to)   ? sp?.to[0]   : sp?.to)   || undefined;
  const range      = (Array.isArray(sp?.range)? sp?.range[0]: sp?.range)|| ""; // 'old' disables recent-days default
  const catFilter  = (Array.isArray(sp?.cat)  ? sp?.cat[0]  : sp?.cat)  || ""; // tools|llm|models|updates
  const limitStr   = (Array.isArray(sp?.limit)? sp?.limit[0]: sp?.limit)|| "200";
  const limit      = Number.isFinite(Number(limitStr)) ? Number(limitStr) : 200;

  // Env windows
  const envRecentRaw = process.env.AI_NEWS_RECENT_DAYS || process.env.NEXT_PUBLIC_AI_NEWS_RECENT_DAYS || "3";
  const envOldRaw    = process.env.AI_NEWS_OLD_DAYS    || process.env.NEXT_PUBLIC_AI_NEWS_OLD_DAYS    || "30";
  const recentDays   = clamp(Number(envRecentRaw) || 3, 1, 30);
  const oldDays      = clamp(Number(envOldRaw)    || 30, 1, 365);

  // Compute window
  let from = fromParam;
  let to   = toParam;

  if (range === "old" && !fromParam && !toParam) {
    // Window before the recent period
    from = daysAgoISO(recentDays + oldDays);
    to   = daysAgoISO(recentDays);
  } else if (range !== "old" && !fromParam && !toParam) {
    from = daysAgoISO(recentDays);
    to   = undefined;
  }

  // Fetch, bucket, sort
  const base = await fetchNews({ q, from, to, limit });
  const all  = categorizeNews(base);

  const tools   = all.filter(i => i.category === "tools"  ).sort((a,b)=> (Date.parse(b.date||"")||0)-(Date.parse(a.date||"")||0));
  const llm     = all.filter(i => i.category === "llm"    ).sort((a,b)=> (Date.parse(b.date||"")||0)-(Date.parse(a.date||"")||0));
  const models  = all.filter(i => i.category === "models" ).sort((a,b)=> (Date.parse(b.date||"")||0)-(Date.parse(a.date||"")||0));
  const updates = all.filter(i => i.category === "updates").sort((a,b)=> (Date.parse(b.date||"")||0)-(Date.parse(a.date||"")||0)).slice(0, 10);

  const showOnlyCat = range === "old" && ["tools","llm","models","updates"].includes(catFilter);

  const oldHrefFor = (cat: NewsCategory) =>
    q ? `/ai-news?range=old&cat=${cat}&q=${encodeURIComponent(q)}`
      : `/ai-news?range=old&cat=${cat}`;

  const headerSubtitle =
    range === "old" && !fromParam && !toParam
      ? `Showing older posts from the ${oldDays}-day window before the recent period.`
      : range !== "old" && !fromParam && !toParam
      ? `Showing the last ${recentDays} day${recentDays > 1 ? "s" : ""} by default.`
      : "Custom date range.";

  return (
    <div className={["mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8", theme.pageBg].join(" ")}>
      {/* Top header strip */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={["text-xl font-bold tracking-tight", theme.textPrimary].join(" ")}>AI News</h1>
          </div>

          {/* Controls */}
        </div>
        {/* Decorative underline */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-gradient-to-r from-amber-500 via-indigo-500 to-teal-500 opacity-75" />
      </div>

      {/* Sections */}
      {showOnlyCat ? (
        <>
          {catFilter === "tools"   && <Section category="tools"   title="AI Tools — Old News"   items={tools}   />}
          {catFilter === "llm"     && <Section category="llm"     title="LLM — Old News"        items={llm}     />}
          {catFilter === "models"  && <Section category="models"  title="AI Models — Old News"  items={models}  />}
          {catFilter === "updates" && <Section category="updates" title="AI Updates — Old News" items={updates} />}
        </>
      ) : (
        <>
          <Section category="tools"   title="AI Tools"               items={tools}   moreHref={oldHrefFor("tools")} />
          <Section category="llm"     title="LLM"                    items={llm}     moreHref={oldHrefFor("llm")} />
          <Section category="models"  title="AI Models"              items={models}  moreHref={oldHrefFor("models")} />
          <Section category="updates" title="AI Updates"             items={updates} moreHref={oldHrefFor("updates")} cap={10} />
        </>
      )}
    </div>
  );
}
