'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type FacetItem = { value: string; count: number };
type Facets = {
  categories: FacetItem[];
  tasks: FacetItem[];
  roles: FacetItem[];
  best_for: FacetItem[];
  use_cases: FacetItem[];
  models: FacetItem[];
  languages: FacetItem[];
  integrations: FacetItem[];
  tags: FacetItem[];
  pricing_model: FacetItem[];
};

type ResultItem = {
  slug: string;
  name: string;
  tagline?: string;
  summary?: string;
  logo_url?: string | null;
  main_category?: string | null;
  subcategory?: string | null;
};

type ApiResponse = {
  ok: boolean;
  total: number;
  offset: number;
  limit: number;
  items: ResultItem[];
  facets: Facets;
};

type Sel = Record<string, Set<string>>;

function useSelections() {
  const [sel, setSel] = useState<Sel>({
    categories: new Set(),
    tasks: new Set(),
    roles: new Set(),
    best_for: new Set(),
    use_cases: new Set(),
    models: new Set(),
    languages: new Set(),
    integrations: new Set(),
    tags: new Set(),
    pricing_model: new Set(),
  });

  function toggle(group: keyof Sel, v: string) {
    setSel((prev) => {
      const next = new Set(prev[group]);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return { ...prev, [group]: next };
    });
  }

  function toQuery() {
    const params = new URLSearchParams();
    (Object.keys(sel) as (keyof Sel)[]).forEach((k) => {
      const arr = Array.from(sel[k]);
      if (arr.length) params.set(k, arr.join(','));
    });
    return params;
  }

  function clearAll() {
    setSel({
      categories: new Set(),
      tasks: new Set(),
      roles: new Set(),
      best_for: new Set(),
      use_cases: new Set(),
      models: new Set(),
      languages: new Set(),
      integrations: new Set(),
      tags: new Set(),
      pricing_model: new Set(),
    });
  }

  return { sel, toggle, toQuery, clearAll };
}

export default function GuidedFilterClient() {
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(24);
  const [offset, setOffset] = useState(0);

  const { sel, toggle, toQuery, clearAll } = useSelections();

  async function fetchAll(opts?: { offset?: number }) {
    setLoading(true);
    const params = toQuery();
    if (q.trim()) params.set('q', q.trim());
    params.set('limit', String(limit));
    params.set('offset', String(opts?.offset ?? offset));
    const url = `/api/guided?${params.toString()}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data: ApiResponse = await res.json();
    setFacets(data.facets);
    setItems(data.items);
    setTotal(data.total);
    setOffset(data.offset);
    setLoading(false);
  }

  useEffect(() => {
    // initial load
    fetchAll().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  function applyFilters() {
    fetchAll({ offset: 0 });
  }

  function nextPage() {
    if (!canNext) return;
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchAll({ offset: newOffset });
  }

  function prevPage() {
    if (!canPrev) return;
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
    fetchAll({ offset: newOffset });
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Find the right AI tool</h1>
        <p className="text-sm text-gray-600">Use search and filters to narrow the catalog. This is a preview UI powered by <code>/api/guided</code>.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g., chat, marketing, code"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              Apply
            </button>
            <button
              onClick={() => { clearAll(); setQ(''); setOffset(0); fetchAll({ offset: 0 }); }}
              className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          {/* Facet groups */}
          <div className="mt-4 space-y-4">
            {facets ? (
              <>
                <FacetGroup title="Categories" list={facets.categories} selected={sel.categories} onToggle={(v) => toggle('categories', v)} />
                <FacetGroup title="Tasks" list={facets.tasks} selected={sel.tasks} onToggle={(v) => toggle('tasks', v)} />
                <FacetGroup title="Roles" list={facets.roles} selected={sel.roles} onToggle={(v) => toggle('roles', v)} />
                <FacetGroup title="Use cases" list={facets.use_cases} selected={sel.use_cases} onToggle={(v) => toggle('use_cases', v)} />
                <FacetGroup title="Best for" list={facets.best_for} selected={sel.best_for} onToggle={(v) => toggle('best_for', v)} />
                <FacetGroup title="Models" list={facets.models} selected={sel.models} onToggle={(v) => toggle('models', v)} />
                <FacetGroup title="Languages" list={facets.languages} selected={sel.languages} onToggle={(v) => toggle('languages', v)} />
                <FacetGroup title="Integrations" list={facets.integrations} selected={sel.integrations} onToggle={(v) => toggle('integrations', v)} />
                <FacetGroup title="Tags" list={facets.tags} selected={sel.tags} onToggle={(v) => toggle('tags', v)} />
                <FacetGroup title="Pricing model" list={facets.pricing_model} selected={sel.pricing_model} onToggle={(v) => toggle('pricing_model', v)} />
              </>
            ) : (
              <div className="text-sm text-gray-500">Loading facets…</div>
            )}
          </div>
        </aside>

        {/* Results */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {loading ? 'Loading…' : `${total} result${total === 1 ? '' : 's'}`}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                disabled={!canPrev || loading}
                onClick={prevPage}
                className="rounded-md border bg-white px-2 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={!canNext || loading}
                onClick={nextPage}
                className="rounded-md border bg-white px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {!loading && items.length === 0 && (
              <div className="col-span-full rounded-md border bg-white p-6 text-center text-sm text-gray-600">
                No results. Adjust filters and try again.
              </div>
            )}
            {items.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="flex items-start gap-3 rounded-md border bg-white p-3 hover:bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.logo_url || '/favicon.ico'}
                  alt={t.name}
                  width={40}
                  height={40}
                  className="rounded border bg-white"
                />
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.tagline && <div className="text-sm text-gray-600 line-clamp-2">{t.tagline}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  list,
  selected,
  onToggle,
}: {
  title: string;
  list: FacetItem[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  const top = useMemo(() => list.slice(0, 12), [list]); // keep it small for preview
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 max-h-52 overflow-auto rounded border bg-gray-50 p-2">
        {top.length === 0 ? (
          <div className="text-xs text-gray-500">No data</div>
        ) : (
          <ul className="space-y-1">
            {top.map((it) => {
              const id = `${title}-${it.value}`;
              const checked = selected.has(it.value);
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  <label htmlFor={id} className="flex items-center gap-2 text-sm">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(it.value)}
                    />
                    <span>{it.value}</span>
                  </label>
                  <span className="text-xs text-gray-500">{it.count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
