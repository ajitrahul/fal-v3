// app/tools/page.tsx
import Link from "next/link";
import Image from "next/image";
import ToolCard from "@/components/ToolCard";
import { DB } from "@/lib/data";

type Tool = (typeof DB)["tools"][number];

const PAGE_SIZE = 32;

/* ------------------------------ helpers ------------------------------ */

function includesCI(hay: string | undefined, needle: string) {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function filterByQuery(list: Tool[], q: string | undefined): Tool[] {
  if (!q || !q.trim()) return list;
  const term = q.trim().toLowerCase();
  return list.filter((t) => {
    const cats = Array.isArray(t.categories) ? t.categories.join(" ") : "";
    const tasks = Array.isArray(t.tasks) ? t.tasks.join(" ") : "";
    return (
      includesCI(t.name, term) ||
      includesCI((t as any).tagline, term) ||
      includesCI((t as any).summary, term) ||
      includesCI(cats, term) ||
      includesCI(tasks, term)
    );
  });
}

function getRating(t: any): number {
  const r = t?.community?.rating;
  const n = typeof r === "string" ? parseFloat(r) : Number(r);
  return Number.isFinite(n) ? n : 0;
}

function getReviews(t: any): number {
  return Array.isArray(t?.community?.reviews) ? t.community.reviews.length : 0;
}

function getUpdatedAt(t: any): number {
  const v = t?.updated_at || t?.release_date;
  const d = v ? new Date(v).getTime() : 0;
  return Number.isFinite(d) ? d : 0;
}

function sortTools(list: Tool[], sort?: string): Tool[] {
  const s = (sort || "").toLowerCase();
  const arr = [...list];
  switch (s) {
    case "rating":
      return arr.sort((a, b) => {
        const rb = getRating(b);
        const ra = getRating(a);
        if (rb !== ra) return rb - ra;
        return getReviews(b) - getReviews(a); // tie-breaker
      });
    case "reviews":
      return arr.sort((a, b) => getReviews(b) - getReviews(a));
    case "new":
      return arr.sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a));
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return arr; // relevance (original order)
  }
}

function toInt(v: string | undefined, d = 1) {
  const n = v ? parseInt(v, 10) : d;
  return Number.isFinite(n) && n > 0 ? n : d;
}

function urlWith(sp: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = { ...sp, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v != null && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return `/tools${qs ? `?${qs}` : ""}`;
}

function getAllCategories(): string[] {
  const set = new Set<string>();
  for (const t of DB.tools) {
    const arr = Array.isArray((t as any).categories) ? (t as any).categories : [];
    for (const c of arr) if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function parseSelectedCats(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  // support comma separated as well
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function filterByCategories(list: Tool[], cats: string[]): Tool[] {
  if (!cats.length) return list;
  const set = new Set(cats);
  return list.filter((t) => {
    const arr = Array.isArray(t.categories) ? t.categories : [];
    return arr.some((c) => set.has(c));
  });
}

/* ------------------------------- page -------------------------------- */

export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spRaw = await searchParams;
  // normalize only single values
  const sp: Record<string, string | string[] | undefined> = spRaw;

  const q = typeof sp.q === "string" ? sp.q : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const page = toInt(typeof sp.page === "string" ? sp.page : undefined, 1);
  const selectedCats = parseSelectedCats(sp.cats);

  // 1) Filter (query + categories)
  const catsAll = getAllCategories();
  const filteredQ = filterByQuery(DB.tools, q);
  const filtered = filterByCategories(filteredQ, selectedCats);

  // 2) Sort
  const sorted = sortTools(filtered, sort);

  // 3) Paginate
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const from = (cur - 1) * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, total);
  const slice = sorted.slice(from, to);

  // Build a map of category -> count (for the current filtered-by-query result, before category filter)
  const counts = new Map<string, number>();
  for (const t of filteredQ) {
    for (const c of Array.isArray((t as any).categories) ? (t as any).categories : []) {
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Explore tools</h1>

        {/* Pure server sort control: GET form updates ?sort=... and preserves q & cats & page */}
        <form action="/tools" method="get" className="flex items-center gap-2">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {/* keep selected categories */}
          {selectedCats.map((c) => (
            <input key={c} type="hidden" name="cats" value={c} />
          ))}
          <label htmlFor="sort" className="text-sm text-gray-700">
            Sort:
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort || ""}
            className="rounded-md border px-2 py-1 text-sm"
            aria-label="Sort tools"
          >
            <option value="">Relevance</option>
            <option value="rating">Top rated</option>
            <option value="reviews">Most reviewed</option>
            <option value="new">Newest</option>
            <option value="name">A–Z</option>
          </select>
          <button type="submit" className="rounded-md border px-3 py-1 text-sm">
            Apply
          </button>
        </form>
      </div>

      {/* Filters + results */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* LEFT: Category filters (server only) */}
        <aside className="rounded-lg border bg-white p-3">
          <form action="/tools" method="get" className="space-y-3">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {sort ? <input type="hidden" name="sort" value={sort} /> : null}
            {/* when applying filters, reset page to 1 */}
            <input type="hidden" name="page" value="1" />

            <h2 className="text-sm font-semibold text-gray-900">Categories</h2>
            <div className="mt-2 max-h-[360px] space-y-1 overflow-auto pr-1">
              {catsAll.map((c) => {
                const id = `cat-${c.replace(/[^a-z0-9]+/gi, "-")}`;
                const checked = selectedCats.includes(c);
                const count = counts.get(c) || 0;
                if (count === 0) return null; // hide categories that have no matches for current query
                return (
                  <label key={c} htmlFor={id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-gray-50">
                    <span className="flex items-center gap-2">
                      <input id={id} type="checkbox" name="cats" value={c} defaultChecked={checked} />
                      <span className="text-sm text-gray-800">{c}</span>
                    </span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="rounded-md border px-3 py-1 text-sm">
                Apply filters
              </button>
              <a
                href={urlWith({ q, sort }, { page: "1" })}
                className="rounded-md border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear
              </a>
            </div>
          </form>
        </aside>

        {/* RIGHT: Results */}
        <div>
          {/* Stat line */}
          <div className="mb-3 text-sm text-gray-600">
            Showing{" "}
            <span className="font-medium">
              {total === 0 ? 0 : from + 1}–{to}
            </span>{" "}
            of <span className="font-medium">{total}</span>
            {q ? (
              <>
                {" "}
                for “<span className="font-medium">{q}</span>”
              </>
            ) : null}
            {selectedCats.length ? (
              <>
                {" "}
                in{" "}
                <span className="font-medium">
                  {selectedCats.join(", ")}
                </span>
              </>
            ) : null}
          </div>

          {slice.length === 0 ? (
            <div className="rounded-md border bg-white p-6 text-center text-gray-700">
              No tools found{q ? <> for “{q}”</> : ""}. Try a different search term or clear
              filters.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {slice.map((t) => (
                  <ToolCard key={t.id} tool={t} sponsored={false} ctx="explore_card" />
                ))}
              </div>

              {/* Pager */}
              {totalPages > 1 ? (
                <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
                  {cur > 1 ? (
                    <Link
                      href={urlWith({ q, sort, cats: selectedCats.join(",") }, { page: String(cur - 1) })}
                      className="rounded-md border px-3 py-1 hover:bg-gray-50"
                    >
                      ← Prev
                    </Link>
                  ) : (
                    <span className="rounded-md border px-3 py-1 text-gray-400">← Prev</span>
                  )}

                  <span className="px-2 text-gray-700">
                    Page <span className="font-medium">{cur}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </span>

                  {cur < totalPages ? (
                    <Link
                      href={urlWith({ q, sort, cats: selectedCats.join(",") }, { page: String(cur + 1) })}
                      className="rounded-md border px-3 py-1 hover:bg-gray-50"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="rounded-md border px-3 py-1 text-gray-400">Next →</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
