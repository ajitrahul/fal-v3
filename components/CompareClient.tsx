"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/* ---------------- Types ---------------- */
type ToolRow = {
  slug: string;
  name?: string;
  category?: string;
  from_price?: string | number | null;
  has_free_tier?: boolean;
  has_api?: boolean;
  is_open_source?: boolean;
  models_count?: number;
  modalities?: string[];
  sdk_count?: number;
  integrations_count?: number;
  security?: { encryption?: boolean; certifications?: string[] };
  best_for?: string[];
};

type Criteria = { id: string; label: string; weight: number };
type Scores = Record<string, Record<string, number>>; // scores[slug][criteriaId] = 0..5

type AIBlock = {
  criteria: Criteria[];
  scores: Scores;
  analysis?: Record<
    string,
    {
      strengths?: string[];
      weaknesses?: string[];
      notes?: string;
    }
  >;
  verdict?: {
    best_overall?: string;
    by_use_case?: { use_case: string; slug: string }[];
  };
};

type Resp =
  | {
      ok: true;
      matrix: ToolRow[];
      ai?: AIBlock;
      promptChars?: number;
      modelUsed?: string;
      ai_error?: string;
    }
  | { ok: false; error: string; detail?: string };

/* ---------------- Small helpers ---------------- */
function k(n: number | undefined | null) {
  if (n == null) return "-";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "m";
}

function joinAnd(items: string[], max = 3) {
  const arr = items.filter(Boolean).slice(0, max);
  if (arr.length <= 1) return arr.join("");
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

/* ----- Compute quick “differences only” facts for mobile ----- */
type FactKey =
  | "from_price"
  | "has_free_tier"
  | "has_api"
  | "is_open_source"
  | "models_count"
  | "sdk_count"
  | "integrations_count"
  | "modalities"
  | "category";

function computeMobileDiffs(matrix: ToolRow[]) {
  const keys: FactKey[] = [
    "from_price",
    "has_free_tier",
    "has_api",
    "is_open_source",
    "models_count",
    "sdk_count",
    "integrations_count",
    "modalities",
    "category",
  ];
  const diffs: { key: FactKey; label: string }[] = [];
  for (const key of keys) {
    const values = matrix.map((t) =>
      key === "modalities" ? (t.modalities || []).join(",") : (t as any)[key]
    );
    const uniq = new Set(values.map((v) => String(v ?? "")));
    if (uniq.size > 1) {
      const labelMap: Record<FactKey, string> = {
        from_price: "Price",
        has_free_tier: "Free tier",
        has_api: "API",
        is_open_source: "Open source",
        models_count: "Models",
        sdk_count: "SDKs",
        integrations_count: "Integrations",
        modalities: "Modalities",
        category: "Category",
      };
      diffs.push({ key, label: labelMap[key] });
    }
  }
  return diffs;
}

/* ---------------- View param helpers ---------------- */
type ViewMode = "by-criteria" | "by-tool";
function normalizeViewParam(v: string | null | undefined): ViewMode | null {
  const s = (v || "").toLowerCase().trim();
  if (s === "criteria" || s === "by-criteria") return "by-criteria";
  if (s === "tool" || s === "tools" || s === "by-tool") return "by-tool";
  return null;
}

/* ---------------- Main component ---------------- */
export default function CompareClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const slugs = useMemo(() => {
    const raw = (sp.get("tools") || sp.get("slugs") || "").trim();
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3) : [];
  }, [sp]);

  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  // View mode (now controllable via `?view=criteria|tool`)
  const urlView = normalizeViewParam(sp.get("view"));
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // If URL specifies a valid view, honor it immediately.
    if (urlView) return urlView;
    // Otherwise keep your original default:
    if (typeof window !== "undefined") {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      return isDesktop ? "by-tool" : "by-criteria";
    }
    return "by-criteria";
  });

  // Keep state in sync if the URL param changes
  useEffect(() => {
    if (urlView && urlView !== viewMode) {
      setViewMode(urlView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView]);

  // When user toggles the selector, reflect it in the URL (shallow replace)
  function setViewAndSync(v: ViewMode) {
    setViewMode(v);
    try {
      const qs = new URLSearchParams(Array.from(sp.entries()));
      qs.set("view", v === "by-criteria" ? "criteria" : "tool");
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    } catch {
      // noop
    }
  }

  useEffect(() => {
    if (!slugs.length) return;
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/compare/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs }),
        });
        const json = (await res.json()) as Resp;
        if (!aborted) setData(json);
      } catch (e: any) {
        if (!aborted) setData({ ok: false, error: "Fetch failed", detail: String(e?.message || e) });
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [slugs]);

  /* ---------- Empty / Loading / Error ---------- */
  if (!slugs.length) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <h1 className="text-2xl font-semibold tracking-tight">Compare Tools</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add <code>?tools=slug1,slug2,slug3</code> to the URL (max 3). Example:{" "}
          <code>/compare?tools=openai-chatgpt,anthropic-claude-3</code>
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <h1 className="text-2xl font-semibold tracking-tight">Compare Tools</h1>
        <p className="mt-2 text-sm text-gray-600">Loading comparison…</p>
        <div className="mt-4 space-y-3">
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200/60" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200/60" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200/60" />
        </div>
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <h1 className="text-2xl font-semibold tracking-tight">Compare Tools</h1>
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{data.error}</p>
          {data.detail && <p className="text-xs mt-1 opacity-80">{data.detail}</p>}
        </div>
      </div>
    );
  }

  const matrix = data.matrix;
  const ai = data.ai;

  // Weighted totals
  const totals: Record<string, number> = {};
  if (ai?.criteria?.length && ai?.scores) {
    for (const row of matrix) {
      const slug = row.slug;
      const scoreRow = ai.scores[slug] || {};
      let sum = 0;
      for (const c of ai.criteria) {
        const s = Number(scoreRow[c.id] ?? 0);
        sum += s * c.weight;
      }
      totals[slug] = sum;
    }
  }

  // Identify winner & runner-up
  const ranking = Object.keys(totals)
    .map((slug) => ({ slug, total: totals[slug] }))
    .sort((a, b) => b.total - a.total);

  const winnerSlug =
    ai?.verdict?.best_overall ||
    (ranking.length ? ranking[0].slug : undefined);

  const runnerSlug =
    ranking.length > 1 ? ranking[1].slug : undefined;

  const nameOf = (slug?: string) => matrix.find((t) => t.slug === slug)?.name || slug || "";

  /* ---------------- Mobile “By Criteria” renderer ---------------- */
  function MobileScoresByCriteria() {
    if (!ai?.criteria?.length || !ai?.scores) return null;

    return (
      <div className="mt-3 space-y-4 md:hidden">
        {ai.criteria.map((c) => {
          const maxForCrit = Math.max(
            1,
            ...matrix.map((t) => Number(ai.scores[t.slug]?.[c.id] ?? 0))
          );
          return (
            <div key={c.id} className="rounded-lg border border-gray-200 p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-gray-500">Weight {Math.round(c.weight * 100)}%</div>
              </div>

              <div className="mt-2 space-y-2">
                {matrix.map((t) => {
                  const val = Number(ai.scores[t.slug]?.[c.id] ?? 0);
                  const pct = Math.max(0, Math.min(100, (val / maxForCrit) * 100));
                  const isLeader =
                    val === Math.max(...matrix.map((x) => Number(ai.scores[x.slug]?.[c.id] ?? 0)));
                  return (
                    <div key={t.slug}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{t.name || t.slug}</span>
                        <span className="tabular-nums">{val.toFixed(1)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-gray-200">
                        <div
                          className={`h-2 rounded ${isLeader ? "bg-emerald-600" : "bg-gray-500"}`}
                          style={{ width: `${pct}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------------- Mobile: Key Differences chips ---------------- */
  function MobileKeyDiffs() {
    const diffs = computeMobileDiffs(matrix);
    if (!diffs.length) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-2 md:hidden">
        {diffs.map((d) => (
          <span
            key={d.key}
            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800"
            title={`Values differ across tools: ${d.label}`}
          >
            {d.label}
          </span>
        ))}
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Compare Tools</h1>
        <p className="text-sm text-gray-600">
          Comparing: <span className="font-medium">{slugs.join(", ")}</span>
        </p>
        {data.modelUsed && (
          <p className="text-xs text-gray-500 mt-1">AI model: {data.modelUsed}</p>
        )}
        {data.ai_error && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800 text-sm">
            AI note: {data.ai_error}
          </div>
        )}

        {/* Mobile view switcher – now synced to URL (?view=criteria|tool) */}
        {ai && (
          <div className="mt-3 inline-flex overflow-hidden rounded-lg border border-gray-200 md:hidden">
            <button
              type="button"
              onClick={() => setViewAndSync("by-criteria")}
              className={`px-3 py-1.5 text-sm ${
                viewMode === "by-criteria" ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              }`}
            >
              By Criteria
            </button>
            <button
              type="button"
              onClick={() => setViewAndSync("by-tool")}
              className={`px-3 py-1.5 text-sm border-l border-gray-200 ${
                viewMode === "by-tool" ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              }`}
            >
              By Tool
            </button>
          </div>
        )}
      </header>

      {/* ---------- Facts (Responsive) ---------- */}
      <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <h2 className="text-lg font-semibold">Facts</h2>

        {/* Mobile: key diffs chips + stacked cards */}
        <MobileKeyDiffs />

        <div className="mt-3 grid gap-3 md:hidden">
          {matrix.map((t) => (
            <div key={t.slug} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.name || t.slug}</div>
                {winnerSlug === t.slug && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">Best</span>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium">{t.category || "-"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">From</dt>
                  <dd className="font-medium">{t.from_price ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Free tier</dt>
                  <dd className="font-medium">{t.has_free_tier ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">API</dt>
                  <dd className="font-medium">{t.has_api ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Open source</dt>
                  <dd className="font-medium">{t.is_open_source ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Models</dt>
                  <dd className="font-medium">{t.models_count ?? 0}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Modalities</dt>
                  <dd className="font-medium">{(t.modalities || []).join(", ") || "-"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">SDKs</dt>
                  <dd className="font-medium">{k(t.sdk_count)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Integrations</dt>
                  <dd className="font-medium">{k(t.integrations_count)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Security</dt>
                  <dd className="font-medium">
                    {(t.security?.encryption ? "Enc" : "") +
                      (t.security?.certifications?.length ? `, ${t.security.certifications.length} certs` : "") ||
                      "-"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="mt-3 overflow-x-auto hidden md:block">
          <table className="min-w-[820px] w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">Tool</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">From</th>
                <th className="py-2 pr-3">Free</th>
                <th className="py-2 pr-3">API</th>
                <th className="py-2 pr-3">Open</th>
                <th className="py-2 pr-3">Models</th>
                <th className="py-2 pr-3">Modalities</th>
                <th className="py-2 pr-3">SDKs</th>
                <th className="py-2 pr-3">Integrations</th>
                <th className="py-2 pr-3">Security</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((t) => (
                <tr key={t.slug} className="border-t">
                  <td className="py-2 pr-3 font-medium">
                    {t.name || t.slug}
                    {winnerSlug === t.slug && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">Best</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{t.category || "-"}</td>
                  <td className="py-2 pr-3">{t.from_price ?? "-"}</td>
                  <td className="py-2 pr-3">{t.has_free_tier ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3">{t.has_api ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3">{t.is_open_source ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3">{t.models_count ?? 0}</td>
                  <td className="py-2 pr-3">{(t.modalities || []).join(", ") || "-"}</td>
                  <td className="py-2 pr-3">{k(t.sdk_count)}</td>
                  <td className="py-2 pr-3">{k(t.integrations_count)}</td>
                  <td className="py-2 pr-3">
                    {(t.security?.encryption ? "Enc" : "") +
                      (t.security?.certifications?.length ? `, ${t.security.certifications.length} certs` : "") ||
                      "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Scores ---------- */}
      {ai && (
        <>
          <section className="mt-5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <h2 className="text-lg font-semibold">Scores</h2>

            <div className="mt-1 text-xs text-gray-600">
              Weights:&nbsp;
              {ai.criteria.map((c) => (
                <span key={c.id} className="mr-3 inline-block">
                  <span className="font-medium">{c.label}</span> {Math.round(c.weight * 100)}%
                </span>
              ))}
            </div>

            {/* MOBILE: By-criteria bars (clear comparison) */}
            {viewMode === "by-criteria" && <MobileScoresByCriteria />}

            {/* MOBILE: By-tool chips */}
            {viewMode === "by-tool" && (
              <div className="mt-3 grid gap-3 md:hidden">
                {matrix.map((t) => {
                  const s = ai.scores[t.slug] || {};
                  const total =
                    ai.criteria.reduce(
                      (acc, c) => acc + Number(s[c.id] ?? 0) * c.weight,
                      0
                    );
                  const isWinner = winnerSlug === t.slug;
                  return (
                    <div
                      key={t.slug}
                      className={`rounded-lg border p-3 ${
                        isWinner ? "border-emerald-300 bg-emerald-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{t.name || t.slug}</div>
                        <div className="text-sm">
                          <span className="text-gray-500 mr-1">Total</span>
                          <span className="font-semibold">{total.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ai.criteria.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700"
                            title={`${c.label} · weight ${Math.round(c.weight * 100)}%`}
                          >
                            <span className="font-medium mr-1">{c.label}:</span>
                            {s[c.id] ?? 0}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DESKTOP: score table */}
            <div className="mt-3 overflow-x-auto hidden md:block">
              <table className="min-w-[820px] w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-3">Tool</th>
                    {ai.criteria.map((c) => (
                      <th key={c.id} className="py-2 pr-3">
                        {c.label}
                      </th>
                    ))}
                    <th className="py-2 pr-3">Weighted total</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((t) => {
                    const s = ai.scores[t.slug] || {};
                    const total = ai.criteria.reduce(
                      (acc, c) => acc + Number(s[c.id] ?? 0) * c.weight,
                      0
                    );
                    return (
                      <tr key={t.slug} className="border-t">
                        <td className="py-2 pr-3 font-medium">{t.name || t.slug}</td>
                        {ai.criteria.map((c) => (
                          <td key={c.id} className="py-2 pr-3">
                            {s[c.id] ?? 0}
                          </td>
                        ))}
                        <td className="py-2 pr-3 font-semibold">{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---------- Analysis cards ---------- */}
          <section className="mt-5 grid gap-4 md:grid-cols-2">
            {matrix.map((t) => {
              const a = ai.analysis?.[t.slug];
              if (!a) return null;
              const isWinner = winnerSlug === t.slug;
              return (
                <div
                  key={t.slug}
                  className={`rounded-xl border p-4 shadow-sm ${
                    isWinner ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t.name || t.slug}</h3>
                    {isWinner && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                        Best overall
                      </span>
                    )}
                  </div>
                  {a.strengths?.length ? (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-emerald-700">Strengths</div>
                      <ul className="mt-1 list-disc pl-5 text-sm text-emerald-900">
                        {a.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {a.weaknesses?.length ? (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-rose-700">Weaknesses</div>
                      <ul className="mt-1 list-disc pl-5 text-sm text-rose-900">
                        {a.weaknesses.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {a.notes ? (
                    <p className="mt-3 text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {a.notes}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </section>

          {/* ---------- Comparison Summary ---------- */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Comparison Summary</h2>
            <div className="mt-2 text-sm text-gray-800 leading-6">
              {winnerSlug ? (
                <>
                  <p>
                    <span className="font-semibold">{nameOf(winnerSlug)}</span> ranks highest overall
                    {typeof totals[winnerSlug] === "number" ? (
                      <>
                        {" "}
                        with a weighted score of{" "}
                        <span className="font-semibold">{totals[winnerSlug].toFixed(2)}</span>
                      </>
                    ) : null}
                    {runnerSlug ? (
                      <>
                        ; the runner-up is{" "}
                        <span className="font-semibold">{nameOf(runnerSlug)}</span>
                        {typeof totals[runnerSlug] === "number" ? (
                          <>
                            {" "}
                            at <span className="font-semibold">{totals[runnerSlug].toFixed(2)}</span>
                          </>
                        ) : null}
                        .
                      </>
                    ) : (
                      "."
                    )}
                  </p>

                  {ai.analysis?.[winnerSlug]?.strengths?.length ? (
                    <p className="mt-2">
                      It stands out for{" "}
                      {joinAnd(
                        ai.analysis[winnerSlug]!.strengths!.map((s) => s.replace(/\.$/, "")),
                        3
                      )}
                      .
                    </p>
                  ) : null}

                  {runnerSlug && ai.analysis?.[runnerSlug]?.strengths?.length ? (
                    <p className="mt-2">
                      <span className="font-semibold">{nameOf(runnerSlug)}</span> can be a better fit if you
                      value{" "}
                      {joinAnd(
                        ai.analysis[runnerSlug]!.strengths!.map((s) => s.replace(/\.$/, "")),
                        2
                      )}{" "}
                      more.
                    </p>
                  ) : null}

                  {ai.verdict?.by_use_case?.length ? (
                    <div className="mt-3">
                      <div className="font-medium">Recommendations by use case:</div>
                      <ul className="mt-1 list-disc pl-5">
                        {ai.verdict.by_use_case.map((u, i) => (
                          <li key={i}>
                            <span className="font-medium">{u.use_case}:</span> {nameOf(u.slug)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {ai.criteria?.length ? (
                    <p className="mt-3 text-gray-700">
                      Scoring emphasized{" "}
                      {joinAnd(
                        [...ai.criteria]
                          .sort((a, b) => b.weight - a.weight)
                          .slice(0, 3)
                          .map((c) => `${c.label} (${Math.round(c.weight * 100)}%)`),
                        3
                      )}
                      .
                    </p>
                  ) : null}
                </>
              ) : (
                <p>
                  We couldn’t compute a final winner because AI scoring wasn’t available. The factual matrix above still
                  highlights concrete differences (pricing, API, integrations, SDKs, and security).
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
