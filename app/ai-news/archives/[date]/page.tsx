// app/ai-news/archives/[date]/page.tsx
import Link from "next/link";
import { fetchNews, categorizeNews } from "@/lib/ai-news-feeds";
import { dayWindowISO, parseYMD, ymdUTC } from "@/lib/ai-news-trending";

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default async function ArchiveDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const p = await params;
  // Validate & normalize YYYY-MM-DD
  const wanted = ymdUTC(parseYMD(p.date));
  const { from, to } = dayWindowISO(wanted);

  const base = await fetchNews({ from, to, limit: 400 });
  const items = categorizeNews(base).sort(
    (a, b) => (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI News — {wanted}</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Headlines from official vendor blogs on this date (AI Tools / LLM / AI Models / Updates).
          </p>
        </div>
        <Link href="/ai-news" className="text-sm text-blue-600 hover:underline dark:text-blue-400">Back to AI News</Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-zinc-400">No articles found for this day.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.url} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Link href={it.url} target="_blank" rel="noopener noreferrer" className="block">
                <h3 className="text-[15px] font-medium text-gray-900 dark:text-zinc-100">
                  {truncate(it.title, 140)}
                </h3>
              </Link>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                <span className="truncate">{it.source}</span>
                <time dateTime={it.date}>{fmtDate(it.date)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
