// app/compare/page.tsx
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

/** Build an absolute URL for server-side fetches */
async function getBaseURL() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/** Small helpers */
function ensureArray(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function k(n: number | null | undefined) {
  if (n == null) return "";
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
}

/** Types mirroring /api/compare/ai response */
type MatrixRow = {
  slug: string;
  name: string;
  category: string;
  from_price: string;
  has_free_tier: boolean;
  has_api: boolean;
  is_open_source: boolean;
  models_count: number;
  modalities: string[];
  sdk_count: number;
  integrations_count: number;
  security: { encryption: boolean; certifications: string[] };
  best_for: string[];
};
type AiResult = {
  criteria: { id: string; label: string; weight: number }[];
  scores: Record<string, Record<string, number>>;
  analysis: Record<string, { strengths: string[]; weaknesses: string[]; notes?: string }>;
  verdict: { best_overall?: string; by_use_case?: { use_case: string; slug: string }[] };
  final_recommendation?: string; // ← NEW
  ai_error?: string;
};
type ApiResp = {
  ok: boolean;
  matrix?: MatrixRow[];
  ai?: AiResult;
  error?: string;
  detail?: string;
  promptChars?: number;
};

/* -------------------- page -------------------- */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ✅ await searchParams (Next.js 15 sync dynamic APIs rule)
  const sp = await searchParams;

  // Accept ?tools= or ?slugs=
  const input =
    (typeof sp.tools === "string" && sp.tools) ||
    (typeof sp.slugs === "string" && sp.slugs) ||
    "";

  const slugs = ensureArray(input).slice(0, 3);

  if (slugs.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">Compare</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-zinc-300">
          Select up to 3 tools on the home page (use the “Compare” checkbox), then open the compare view —
          or pass them in the URL, e.g.{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-zinc-800">
            /compare?tools=openai-chatgpt,anthropic-claude-3
          </code>
          .
        </p>
      </main>
    );
  }

  // Build absolute API URL and fetch
  const base = await getBaseURL();
  const apiURL = `${base}/api/compare/ai?slugs=${encodeURIComponent(slugs.join(","))}`;

  const res = await fetch(apiURL, { cache: "no-store" });
  const data = (await res.json()) as ApiResp;

  if (!data.ok || !data.matrix) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">Compare</h1>
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          Failed to compare. {data.error || data.detail || `HTTP ${res.status}`}
        </p>
      </main>
    );
  }

  const matrix = data.matrix;
  const ai = data.ai;

  function badge(ok: boolean, labelTrue = "Yes", labelFalse = "No") {
    return (
      <span
        className={[
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
          ok
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-800"
            : "bg-gray-100 text-gray-700 ring-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
        ].join(" ")}
      >
        {ok ? labelTrue : labelFalse}
      </span>
    );
  }

  function scoreBar(val: number) {
    const pct = Math.max(0, Math.min(100, (val / 5) * 100));
    return (
      <div className="h-2 w-full rounded bg-gray-100 dark:bg-zinc-800">
        <div
          className="h-2 rounded bg-indigo-500 dark:bg-indigo-400"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      {/* Header: selected tools */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2">
          {matrix.map((m) => (
            <Link
              key={m.slug}
              href={`/tools/${m.slug}`}
              className="group inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:shadow-sm dark:border-zinc-700"
            >
              <Image
                src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(
                  `https://${m.slug}.com`
                )}`}
                alt=""
                width={16}
                height={16}
                className="opacity-60 group-hover:opacity-100"
              />
              <span className="font-medium text-gray-900 dark:text-zinc-100">{m.name}</span>
              <span className="text-xs text-gray-500 dark:text-zinc-400">({m.slug})</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Summary (AI or fallback) */}
      {ai && (
        <section className="mt-6 rounded-2xl border p-4 md:p-6 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Comparison Summary</h2>

          {/* Final recommendation (NEW) */}
          {ai.final_recommendation && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-800">
              <div className="font-medium">Final Recommendation</div>
              <p className="mt-1">{ai.final_recommendation}</p>
            </div>
          )}

          {/* Verdict */}
          {(ai.verdict?.best_overall || (ai.verdict?.by_use_case?.length ?? 0) > 0) && (
            <div className="mt-3 text-sm text-gray-700 dark:text-zinc-300">
              {ai.verdict?.best_overall && (
                <p>
                  <span className="font-medium">Best overall:</span>{" "}
                  <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-zinc-800">
                    {ai.verdict.best_overall}
                  </code>
                </p>
              )}
              {(ai.verdict?.by_use_case?.length ?? 0) > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {ai.verdict!.by_use_case!.map((v, i) => (
                    <li key={i}>
                      <span className="font-medium">{v.use_case}:</span>{" "}
                      <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-zinc-800">{v.slug}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Per-tool analysis */}
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {matrix.map((m) => {
              const a = ai.analysis?.[m.slug];
              return (
                <div key={m.slug} className="rounded-xl border p-3 dark:border-zinc-700">
                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{m.name}</div>
                  {a?.strengths?.length ? (
                    <>
                      <div className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Strengths
                      </div>
                      <ul className="mt-1 list-disc pl-5 text-sm text-gray-700 dark:text-zinc-300">
                        {a.strengths.slice(0, 4).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {a?.weaknesses?.length ? (
                    <>
                      <div className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                        Weaknesses
                      </div>
                      <ul className="mt-1 list-disc pl-5 text-sm text-gray-700 dark:text-zinc-300">
                        {a.weaknesses.slice(0, 4).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {a?.notes ? (
                    <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400 italic">{a.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {ai.ai_error && (
            <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
              AI note: {ai.ai_error}. Falling back to deterministic analysis where needed.
            </p>
          )}
        </section>
      )}

      {/* Scores */}
      {ai?.scores && ai?.criteria && (
        <section className="mt-6 rounded-2xl border p-4 md:p-6 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Scores</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {ai.criteria.map((c) => (
              <div key={c.id} className="rounded-xl border p-3 dark:border-zinc-700">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{c.label}</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">weight {c.weight}</div>
                </div>
                <div className="space-y-2">
                  {matrix.map((m) => {
                    const val = ai.scores?.[m.slug]?.[c.id] ?? 0;
                    return (
                      <div key={m.slug}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700 dark:text-zinc-300">{m.name}</span>
                          <span className="text-gray-500 dark:text-zinc-400">{val}/5</span>
                        </div>
                        {scoreBar(val)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Facts table */}
      <section className="mt-6 overflow-x-auto rounded-2xl border dark:border-zinc-700">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
              <th className="px-3 py-2 text-left font-semibold">Field</th>
              {matrix.map((m) => (
                <th key={m.slug} className="px-3 py-2 text-left font-semibold">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Category</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{m.category}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">From price</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{m.from_price}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Free tier</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{badge(m.has_free_tier)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">API</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{badge(m.has_api)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Open source</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{badge(m.is_open_source)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Models</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{k(m.models_count)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Modalities</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{m.modalities.join(", ") || "—"}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">SDKs</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{k(m.sdk_count)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Integrations</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{k(m.integrations_count)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Encryption</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{badge(m.security.encryption)}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Certifications</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">
                  {m.security.certifications.join(", ") || "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500 dark:text-zinc-400">Best for</td>
              {matrix.map((m) => (
                <td key={m.slug} className="px-3 py-2">{m.best_for.join(", ") || "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
