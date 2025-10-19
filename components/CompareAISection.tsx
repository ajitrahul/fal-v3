"use client";

import { useEffect, useState } from "react";

type Tool = Record<string, any>;
type MatrixRow = {
  parameter: string;
  values: { tool: string; value: any }[];
  notes?: string;
};

type CompareJSON = {
  summary: string;
  scoring_basis: string[];
  matrix: MatrixRow[];
  fit_recommendations: { audience: string; reason: string; best_tool: string }[];
  pros_cons: { tool: string; pros: string[]; cons: string[] }[];
  final_take: string;
};

function parseJsonLoose(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const t = (txt || "").trim();
    const i = t.indexOf("{");
    const j = t.lastIndexOf("}");
    if (i >= 0 && j > i) {
      try {
        return JSON.parse(t.slice(i, j + 1));
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

export default function CompareAISection({
  tools,
  userContext = "",
}: {
  tools: Tool[];
  userContext?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<{ status?: number; body?: string } | null>(null);

  async function run() {
    if (!tools || tools.length < 2) return;
    setLoading(true);
    setError(null);
    setData(null);
    setDebug(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000); // 25s safety

    try {
      const res = await fetch("/api/compare-gemini", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tools, user_context: userContext }),
        signal: controller.signal,
      });

      const text = await res.text(); // <- always read text first
      // keep a short snippet for debugging UI
      setDebug({ status: res.status, body: text.slice(0, 800) });

      if (!res.ok) {
        // API is expected to return JSON even on error, but handle HTML too
        const j = parseJsonLoose(text);
        const msg =
          (j && (j.error || j.message)) ||
          `HTTP ${res.status} — non-JSON response from server`;
        throw new Error(msg);
      }

      const parsed = parseJsonLoose(text);
      if (!parsed) {
        throw new Error("Server returned empty/non-JSON body.");
      }
      if (!parsed.ok) {
        throw new Error(parsed.error || "Unknown error from compare API");
      }
      setData(parsed.data as CompareJSON);
    } catch (e: any) {
      // Surface precise reason
      if (e?.name === "AbortError") {
        setError("Request timed out. Please retry.");
      } else {
        setError(e?.message || "Request failed.");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tools), userContext]);

  if (!tools || tools.length < 2) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI analyst view</h2>
        <button
          onClick={run}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-white"
          disabled={loading}
        >
          {loading ? "Analyzing…" : "Re-run analysis"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 space-y-1">
          <div>{error}</div>
          {debug && (
            <details className="text-[12px] text-rose-900/80">
              <summary>Show raw response</summary>
              <pre className="whitespace-pre-wrap break-words mt-1">
                status: {debug.status}
                {"\n"}
                body: {debug.body}
              </pre>
            </details>
          )}
        </div>
      )}

      {!error && loading && <div className="text-sm text-zinc-600">Analyzing the tools with Gemini…</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          {data.summary && (
            <div className="rounded-md border p-4">
              <h3 className="font-medium mb-1">Summary</h3>
              <p className="text-zinc-700">{data.summary}</p>
            </div>
          )}

          {/* Scoring basis */}
          {Array.isArray(data.scoring_basis) && data.scoring_basis.length > 0 && (
            <div className="rounded-md border p-4">
              <h3 className="font-medium mb-2">How this was scored</h3>
              <ul className="list-disc list-inside text-sm text-zinc-700">
                {data.scoring_basis.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Matrix */}
          {Array.isArray(data.matrix) && data.matrix.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="p-2 text-left w-56">Parameter</th>
                    {tools.map((t) => (
                      <th key={t.id} className="p-2 text-left min-w-[18rem]">
                        {t.name}
                      </th>
                    ))}
                    <th className="p-2 text-left w-80">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matrix.map((row, idx) => (
                    <tr key={idx} className="align-top border-t">
                      <td className="p-2 font-medium">{row.parameter}</td>
                      {tools.map((t) => {
                        const val = row.values.find((v) => v.tool === t.name)?.value;
                        return (
                          <td key={t.id} className="p-2">
                            {Array.isArray(val) ? (
                              <ul className="list-disc list-inside space-y-0.5">
                                {val.map((x: any, i: number) => (
                                  <li key={i}>{String(x)}</li>
                                ))}
                              </ul>
                            ) : typeof val === "object" && val !== null ? (
                              <pre className="text-xs bg-zinc-50 rounded p-2 ring-1 ring-zinc-200 overflow-auto">
                                {JSON.stringify(val, null, 2)}
                              </pre>
                            ) : (
                              <span>{val ?? "—"}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-zinc-600">{row.notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pros/Cons */}
          {Array.isArray(data.pros_cons) && data.pros_cons.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {data.pros_cons.map((pc, i) => (
                <div key={i} className="rounded-md border p-4">
                  <h3 className="font-medium">{pc.tool}</h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium text-emerald-700">Pros</div>
                      <ul className="list-disc list-inside text-sm">
                        {(pc.pros || []).map((p, j) => (
                          <li key={j}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-rose-700">Cons</div>
                      <ul className="list-disc list-inside text-sm">
                        {(pc.cons || []).map((c, j) => (
                          <li key={j}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Final take */}
          {data.final_take && (
            <div className="rounded-md border p-4">
              <h3 className="font-medium mb-1">Final take</h3>
              <p className="text-zinc-700">{data.final_take}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
