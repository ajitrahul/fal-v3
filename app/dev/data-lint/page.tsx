// app/dev/data-lint/page.tsx
"use client";

import { useEffect, useState } from "react";

type Warning = {
  type: string;
  slug?: string;
  name?: string;
  detail?: string;
};

export default function DataLintPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch("/api/dev/lint-data", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Unknown error");
        setWarnings(json.warnings || []);
        setTotals(json.totals || {});
      } catch (e: any) {
        setError(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  if (process.env.NODE_ENV === "production") {
    return <div className="p-6 text-sm text-gray-600">Not available in production.</div>;
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">Linting data…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">Error: {error}</div>;

  const groups = warnings.reduce<Record<string, Warning[]>>((acc, w) => {
    (acc[w.type] ||= []).push(w);
    return acc;
  }, {});

  const order = Object.keys(groups).sort((a, b) => (groups[b].length - groups[a].length));

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <h1 className="text-xl font-semibold mb-2">Data Lint</h1>
      <p className="text-sm text-gray-600 mb-6">
        Dev-only checks for common data issues. Fixing these prevents UI regressions (e.g., missing slugs, broken video IDs).
      </p>

      <div className="mb-4 rounded-lg border bg-white p-3">
        <h2 className="text-sm font-semibold mb-2">Summary</h2>
        <div className="flex flex-wrap gap-2">
          {order.map((key) => (
            <span key={key} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              {key}: {groups[key].length}
            </span>
          ))}
          {order.length === 0 ? <span className="text-sm text-gray-600">No warnings 🎉</span> : null}
        </div>
      </div>

      {order.map((key) => (
        <section key={key} className="mb-6">
          <h3 className="text-sm font-semibold mb-2">{key}</h3>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2">Slug</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {groups[key].map((w, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50 border-b last:border-b-0">
                    <td className="px-3 py-2 text-sm">{w.slug || "-"}</td>
                    <td className="px-3 py-2 text-sm">{w.name || "-"}</td>
                    <td className="px-3 py-2 text-sm break-words">{w.detail || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
