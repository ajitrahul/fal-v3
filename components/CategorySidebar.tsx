'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Item = {
  name: string;
  slug: string;
  count: number;
};

export default function CategorySidebar({
  items,
  title = 'Categories',
}: {
  items: Item[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);     // drawer for mobile
  const [q, setQ] = useState('');              // local filter

  // Filtered list (client-only search)
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(k) ||
        String(it.count).includes(k)
    );
  }, [items, q]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  return (
    <>
      {/* Mobile toggle button */}
      <div className="mb-3 block md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          aria-controls="mobile-cat-drawer"
          aria-expanded={open}
        >
          ☰ Browse categories
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block md:sticky md:top-20">
        <div className="rounded-lg border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <div className="mb-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter categories…"
              className="w-full rounded-md border px-2 py-1 text-sm"
              aria-label="Filter categories"
            />
          </div>
          <ul className="max-h-[70vh] overflow-auto pr-1">
            {filtered.map((it) => (
              <li key={it.slug}>
                <Link
                  href={`/categories/${it.slug}`}
                  className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                >
                  <span className="truncate">{it.name}</span>
                  <span className="ml-2 inline-flex min-w-[28px] items-center justify-center rounded-full border bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                    {it.count}
                  </span>
                </Link>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-2 py-1 text-sm text-gray-500">No matches</li>
            )}
          </ul>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div
          id="mobile-cat-drawer"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 md:hidden"
        >
          {/* backdrop */}
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs rounded-r-xl border-r bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-2 py-0.5 text-sm hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="mb-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter categories…"
                className="w-full rounded-md border px-2 py-1 text-sm"
                aria-label="Filter categories"
              />
            </div>

            <ul className="max-h-[80vh] overflow-auto pr-1">
              {filtered.map((it) => (
                <li key={it.slug}>
                  <Link
                    href={`/categories/${it.slug}`}
                    className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                  >
                    <span className="truncate">{it.name}</span>
                    <span className="ml-2 inline-flex min-w-[28px] items-center justify-center rounded-full border bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                      {it.count}
                    </span>
                  </Link>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-500">No matches</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
