// app/ai-news/sources/page.tsx
import Link from "next/link";
import { getNewsSources } from "@/lib/ai-news-feeds";

type Src = { id: string; name: string; homepage?: string };

export default async function SourcesPage() {
  const srcs = await getNewsSources();
  const list: Src[] = Array.isArray(srcs) ? srcs : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">AI News — Sources</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
        Official vendor blogs we aggregate for AI Tools, LLMs and AI Models.
      </p>

      {list.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600 dark:text-zinc-400">No sources configured.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-[15px] font-medium text-gray-900 dark:text-zinc-100">{s.name}</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-zinc-400 truncate">{s.id}</div>
              {s.homepage && (
                <div className="mt-2">
                  <Link
                    href={s.homepage}
                    target="_blank"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    rel="noopener noreferrer"
                  >
                    Visit site
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
