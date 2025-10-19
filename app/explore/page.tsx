// app/explore/page.tsx
// NOTE: Do NOT add "use client" here — this page runs on the server.

import { queryTools } from "@/lib/search";
import ToolCard from "@/components/ToolCard";

export const runtime = "nodejs";
export const revalidate = 0;

type SearchParams = {
  q?: string;
  categories?: string; // comma-separated list in URL, e.g. ?categories=platform,agent
  sort?: "name-asc" | "name-desc";
  limit?: string;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const q = (searchParams?.q ?? "").trim();
  const categories = (searchParams?.categories ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sort = (searchParams?.sort as "name-asc" | "name-desc") ?? "name-asc";
  const limit = Number(searchParams?.limit ?? "90");

  // Fetch on the server (safe, uses fs under the hood)
  const { tools, total, categoryCounts } = await queryTools({
    q,
    categories,
    sort,
    // We fetch all to compute categoryCounts; we slice in render below
    limit: undefined,
  });

  const firstPage = tools.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 90);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Explore Tools</h1>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          {q ? `Results for “${q}” — ` : ""}{total} tools
        </p>
      </header>

      {/* Simple category facet preview */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 16)
            .map(([c, n]) => (
              <span
                key={c}
                className="rounded-full border px-2 py-0.5 text-gray-700 dark:text-zinc-200 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800"
                title={`${n} tools`}
              >
                {c} · {n}
              </span>
            ))}
        </div>
      )}

      {/* Grid of tool cards */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:_balance]">
        {firstPage.map((t) => (
          <ToolCard key={t.slug} tool={t as any} />
        ))}
      </div>
    </main>
  );
}
