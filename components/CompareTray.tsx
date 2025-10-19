'use client';

import { useCompare } from './CompareProvider';
import { useEffect, useMemo, useState } from 'react';

type Option = { slug: string; name: string; tagline?: string | null };

export default function CompareTray() {
  const cmp = useCompare();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [input, setInput] = useState('');

  // Load slugs for autocomplete
  useEffect(() => {
    fetch('/api/slugs', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => setOptions(Array.isArray(j.items) ? j.items : []))
      .catch(() => setOptions([]));
  }, []);

  const datalist = useMemo(() => {
    return options.map(o => ({ value: o.slug, label: `${o.name} (${o.slug})` }));
  }, [options]);

  function add() {
    const s = input.trim().toLowerCase();
    if (!s) return;
    cmp.add(s);
    setInput('');
  }

  function goCompare() {
    if (!cmp.slugs.length) return;
    const qs = encodeURIComponent(cmp.slugs.join(','));
    window.location.href = `/tools/compare?slugs=${qs}`;
  }

  const count = cmp.slugs.length;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 rounded-full shadow-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
        aria-label="Open compare tray"
      >
        Compare
        {count > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-xs text-white">
            {count}
          </span>
        )}
      </button>

      {/* Tray panel */}
      {open && (
        <div className="fixed bottom-16 right-5 z-50 w-[320px] rounded-lg border bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">Compare tools</div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-600 hover:underline"
            >
              Close
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-600">
            Add up to {cmp.max} slugs (e.g. <code>chatgpt</code>, <code>jasper</code>).
          </div>

          <div className="mt-2 flex gap-2">
            <input
              list="compare-slugs"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="type slug…"
              className="flex-1 rounded-md border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-gray-300"
            />
            <button
              onClick={add}
              disabled={!input.trim() || cmp.slugs.length >= cmp.max}
              className="rounded-md border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <datalist id="compare-slugs">
            {datalist.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </datalist>

          {/* Selected chips */}
          <div className="mt-2 flex flex-wrap gap-2">
            {cmp.slugs.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2 py-1 text-xs">
                {s}
                <button
                  onClick={() => cmp.remove(s)}
                  className="ml-1 rounded border px-1 text-[10px] leading-none hover:bg-white"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
            {cmp.slugs.length === 0 && (
              <span className="text-xs text-gray-500">No tools added yet.</span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={cmp.clear}
              disabled={cmp.slugs.length === 0}
              className="rounded-md border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={goCompare}
              disabled={cmp.slugs.length === 0}
              className="rounded-md bg-black px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Compare
            </button>
          </div>
        </div>
      )}
    </>
  );
}
