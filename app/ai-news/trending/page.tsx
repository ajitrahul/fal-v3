// app/ai-news/trending/page.tsx
import Link from "next/link";
import { fetchNews } from "@/lib/ai-news-feeds";
import { bucketByDay, ymdUTC } from "@/lib/ai-news-trending";

function fmtDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m - 1), d));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const daysStr = (Array.isArray(sp?.days) ? sp.days[0] : sp?.days) || "30";
  const days = Math.max(7, Math.min(120, Number(daysStr) || 30));

  // Get a larger slice to allow grouping
  const items = await fetchNews({ limit: 600 });
  const buckets = bucketByDay(items)
    .filter((b) => {
      // keep only last N days
      const today = ymdUTC();
      return b.ymd <= today; // already limited by bucket count next
    })
    .slice(0, days);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trending — Top Daily Activity</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Most active days by number of vendor posts (last {days} days). Click a date to view headlines.
          </p>
        </div>
        <Link href="/ai-news" className="text-sm text-blue-600 hover:underline dark:text-blue-400">Back to AI News</Link>
      </div>

      {buckets.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-zinc-400">No activity detected.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {buckets.map((b) => (
            <li key={b.ymd} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <Link href={`/ai-news/archives/${b.ymd}`} className="text-[15px] font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {fmtDate(b.ymd)}
                </Link>
                <span className="text-xs text-gray-600 dark:text-zinc-400">{b.count} posts</span>
              </div>
              <ul className="mt-2 space-y-1">
                {b.items.slice(0, 4).map((it) => (
                  <li key={it.url} className="text-sm">
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline dark:text-zinc-100">
                      {it.title}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
