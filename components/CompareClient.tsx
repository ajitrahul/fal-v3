'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCompare, COMPARE_STORAGE_KEY } from '@/components/CompareProvider';

type SlugItem = { slug: string; name: string; tagline?: string | null };
type Field = { label: string; key: string; values: (string | null)[] };
type ComparePayload = {
  ok: boolean;
  slugs: string[];
  names: string[];
  fields: Field[];
};

type AiCompare = {
  overview: string;
  key_differences: string[];
  strengths: Record<string, string[]>;
  best_for: { audience: string; pick: string; why: string }[];
  considerations: string[];
  data_used: string[];
  confidence: 'low' | 'medium' | 'high';
};

export default function CompareClient() {
  const searchParams = useSearchParams();
  const cmp = useCompare();

  const [options, setOptions] = useState<SlugItem[]>([]);
  const [inputs, setInputs] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComparePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [ai, setAi] = useState<AiCompare | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);

  // Reset selection helper (so cards show “Add to compare” after a successful compare)
  function resetSelection() {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify([]));
    } catch {}
    try {
      cmp.clear();
    } catch {}
  }

  // load slugs for datalist
  useEffect(() => {
    fetch('/api/slugs', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => setOptions(j.items || []))
      .catch(() => setOptions([]));
  }, []);

  const datalist = useMemo(() => {
    return options.map(o => ({ value: o.slug, label: `${o.name} (${o.slug})` }));
  }, [options]);

  // --- URL prefill support: /tools/compare?slugs=a,b,c ---
  const pendingFromUrl = useRef<string[] | null>(null);

  useEffect(() => {
    const qs = searchParams?.get('slugs');
    if (!qs) return;
    const arr = Array.from(
      new Set(
        qs.split(/[,\|]/g)
          .map(s => s.trim())
          .filter(Boolean)
      )
    ).slice(0, 3);
    if (!arr.length) return;
    pendingFromUrl.current = arr;
    setInputs([arr[0] || '', arr[1] || '', arr[2] || '']);
  }, [searchParams]);

  useEffect(() => {
    const arr = pendingFromUrl.current;
    if (!arr) return;
    // Only fire when inputs match URL and we haven't auto-run yet
    if (inputs[0] === (arr[0] || '') && inputs[1] === (arr[1] || '') && inputs[2] === (arr[2] || '')) {
      pendingFromUrl.current = null;
      // Auto-run compare once
      void runCompare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  async function runCompare() {
    setError(null);
    setData(null);
    setAi(null);
    setAiErr(null);
    setAiModel(null);

    const slugs = inputs.map(s => s.trim()).filter(Boolean);
    if (slugs.length === 0) {
      setError('Add at least one tool slug.');
      return;
    }
    const uniq = Array.from(new Set(slugs)).slice(0, 3);
    setLoading(true);

    // ---- Prefer AI first ----
    try {
      const aiRes = await fetch(`/api/compare/ai?slugs=${encodeURIComponent(uniq.join(','))}`, { cache: 'no-store' });
      const aiJson = await aiRes.json();
      if (aiRes.ok && aiJson?.ok && aiJson?.base && aiJson?.ai) {
        // Use AI 'base' for the table; keep AI summary for UI
        setData({
          ok: true,
          slugs: aiJson.base.slugs,
          names: aiJson.base.names,
          fields: aiJson.base.fields,
        });
        setAi(aiJson.ai as AiCompare);
        setAiModel(aiJson.model || null);

        // ✅ comparison succeeded → reset selection so cards return to “Add to compare”
        resetSelection();

        setLoading(false);
        return; // success via AI
      } else {
        setAiErr(aiJson?.error || 'AI summary unavailable, falling back.');
      }
    } catch {
      setAiErr('AI call failed, falling back.');
    }

    // ---- Fallback to non-AI compare ----
    try {
      const res = await fetch(`/api/compare?slugs=${encodeURIComponent(uniq.join(','))}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Compare failed.');
      } else {
        setData(json);

        // ✅ non-AI comparison also resets selection
        resetSelection();
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  // Manual AI regenerate button (optional)
  async function runAiSummary() {
    if (!data?.slugs?.length) return;
    setAi(null);
    setAiErr(null);
    setAiModel(null);
    setAiBusy(true);
    try {
      const url = `/api/compare/ai?slugs=${encodeURIComponent(data.slugs.join(','))}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAiErr(json.error || 'AI summary failed.');
      } else {
        setAi(json.ai as AiCompare);
        setAiModel(json.model || null);
      }
    } catch {
      setAiErr('Network error.');
    } finally {
      setAiBusy(false);
    }
  }

  function setInput(i: number, v: string) {
    const next = inputs.slice();
    next[i] = v;
    setInputs(next);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6">

      <section className="rounded-lg border bg-white p-4 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tools Comparison</h1>
        <p className="text-sm text-gray-600">
          Enter up to three tools.
        </p>
      </header>
        <div className="grid gap-3 md:grid-cols-3">
          {[0,1,2].map(i => (
            <div key={i}>
              <input
                list="tool-slugs"
                value={inputs[i]}
                onChange={(e) => setInput(i, e.target.value)}
                placeholder="type to search slugs…"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          ))}
        </div>

        <datalist id="tool-slugs">
          {datalist.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </datalist>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={runCompare}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Comparing…' : 'Compare'}
          </button>
          <button
            onClick={() => { setInputs(['','','']); setData(null); setError(null); setAi(null); setAiErr(null); setAiModel(null); }}
            className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {aiErr && !ai && <div className="mt-2 text-sm text-amber-700">{aiErr}</div>}
      </section>

      {data && (
        <section className="rounded-lg border bg-white p-4 shadow-sm overflow-x-auto">
          <div className="mb-2 text-sm text-gray-600">
            Comparing: {data.names.join(' vs ')}
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 w-56">Field</th>
                {data.names.map((n, i) => (
                  <th key={i} className="text-left p-2">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.fields.map((f, i) => (
                <tr key={i} className="border-b last:border-b-0 align-top">
                  <td className="p-2 font-medium text-gray-800">{f.label}</td>
                  {f.values.map((v, j) => (
                    <td key={j} className="p-2 text-gray-800">
                      {v ? v : <span className="text-gray-400">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {ai && (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Summary</h2>
            <button
              onClick={runAiSummary}
              disabled={aiBusy}
              className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {aiBusy ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          <div className="mt-3 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-800">Overview</h3>
              <p className="mt-1 text-sm text-gray-800">{ai.overview}</p>
            </div>

            {ai.key_differences?.length ? (
              <div>
                <h3 className="text-sm font-medium text-gray-800">Key differences</h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-800 space-y-1">
                  {ai.key_differences.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            ) : null}

            {ai.best_for?.length ? (
              <div>
                <h3 className="text-sm font-medium text-gray-800">Best for</h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {ai.best_for.map((b, i) => (
                    <div key={i} className="rounded-md border bg-gray-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">{b.audience}</div>
                      <div className="mt-1 text-sm">
                        <span className="font-medium">{b.pick}</span>
                        <span className="text-gray-700"> — {b.why}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {ai.considerations?.length ? (
              <div>
                <h3 className="text-sm font-medium text-gray-800">Considerations</h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-800 space-y-1">
                  {ai.considerations.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            ) : null}

          </div>
        </section>
      )}
    </div>
  );
}
