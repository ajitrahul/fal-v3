// app/api/compare-gemini/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tool = Record<string, any>;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const DEF_MODEL = (process.env.GEMINI_MODEL || "models/gemini-1.5-pro").trim();
const DEF_ENDPOINT =
  process.env.GEMINI_ENDPOINT?.trim() || "https://generativelanguage.googleapis.com/v1beta";
const DEBUG = process.env.GEMINI_DEBUG === "1" || process.env.GEMINI_DEBUG === "true";

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function error(status: number, msg: string, extra?: any) {
  if (DEBUG) console.error("[compare-gemini][error]", { status, msg, extra });
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

async function callGemini({
  endpoint,
  model,
  payload,
}: {
  endpoint: string;
  model: string;
  payload: any;
}) {
  const urlStr = `${endpoint}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY!
  )}`;
  if (DEBUG) console.log("[compare-gemini][fetch]", urlStr);

  const res = await fetch(urlStr, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();

  if (DEBUG) {
    console.log("[compare-gemini][status]", res.status);
    if (!res.ok) console.log("[compare-gemini][raw-error]", raw.slice(0, 2000));
  }
  return { res, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: health — add ?ping=1 to actually ping Google
// also supports overrides: ?model=...&endpoint=...
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ping = url.searchParams.get("ping");
  const model = (url.searchParams.get("model") || DEF_MODEL).trim();
  const endpoint = (url.searchParams.get("endpoint") || DEF_ENDPOINT).trim();

  if (!ping) {
    if (DEBUG) console.log("[compare-gemini][health]", { hasKey: !!GEMINI_API_KEY, model, endpoint });
    return NextResponse.json({
      ok: true,
      hasKey: Boolean(GEMINI_API_KEY),
      model,
      endpoint,
      tip: "Add ?ping=1 to perform a live call. You can also try ?model=models/gemini-1.5-pro-latest&endpoint=https://generativelanguage.googleapis.com/v1",
    });
  }

  if (!GEMINI_API_KEY) return error(500, "Missing GEMINI_API_KEY");

  const testPayload = {
    contents: [{ role: "user", parts: [{ text: 'Return JSON: {"hello":"world"}' }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };

  try {
    const { res, raw } = await callGemini({ endpoint, model, payload: testPayload });
    const body = safeParse(raw) ?? raw;
    return NextResponse.json(
      { ok: res.ok, status: res.status, tried: { endpoint, model }, detail: body },
      { status: res.ok ? 200 : 500 }
    );
  } catch (e: any) {
    return error(500, e?.message || "Ping failed", { tried: { endpoint, model } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: main compare (with 404 fallbacks)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!GEMINI_API_KEY) return error(500, "Missing GEMINI_API_KEY");

  let body: { tools?: Tool[]; user_context?: string } = {};
  try {
    body = await req.json();
  } catch {
    return error(400, "Invalid JSON body");
  }

  const tools = Array.isArray(body.tools) ? body.tools.slice(0, 3) : [];
  if (tools.length < 2) return error(400, "Provide 2–3 tools to compare");

  const userContext =
    typeof body.user_context === "string" && body.user_context.trim()
      ? body.user_context.trim()
      : "General buyer comparison";

  const url0 = new URL(req.url);
  // Allow query overrides for quick testing
  const model0 = (url0.searchParams.get("model") || DEF_MODEL).trim();
  const endpoint0 = (url0.searchParams.get("endpoint") || DEF_ENDPOINT).trim();

  const sys = `
You are a meticulous product analyst. Compare the provided AI tools with deep specificity.
Use concrete fields (pricing, platforms, models, integrations, flags, best_for, use_cases, pros_cons, compliance, limits, uptime_slo, etc.).
Be decisive and point out meaningful differences; do NOT equalize details unless truly identical.
Return STRICT JSON matching:

{
  "summary": "2–3 sentences highlighting key differences.",
  "scoring_basis": ["dimensions used to score and why"],
  "matrix": [
    {"parameter":"string","values":[{"tool":"Name","value":"string|array|object"}],"notes":"concise analyst note"}
  ],
  "fit_recommendations": [{"audience":"who benefits","reason":"why","best_tool":"Name"}],
  "pros_cons": [{"tool":"Name","pros":["..."],"cons":["..."]}],
  "final_take":"one-paragraph guidance"
}
Only emit JSON. No markdown fences.
`.trim();

  const userPayload = {
    tools: tools.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      tagline: t.tagline,
      summary: t.summary,
      categories: t.categories,
      tasks: t.tasks,
      job_roles: t.job_roles,
      pricing: t.pricing,
      platforms: t.platforms,
      models: t.models,
      integrations: t.integrations,
      languages: t.languages,
      maturity: t.maturity,
      release_date: t.release_date,
      updated_at: t.updated_at,
      status: t.status,
      compliance: t.compliance,
      flags: t.flags,
      best_for: t.best_for,
      use_cases: t.use_cases,
      pros_cons: t.pros_cons,
      uptime_slo: t.uptime_slo,
      limits: t.limits,
      security: t.security,
      data_controls: t.data_controls,
      governance: t.governance,
    })),
    user_context: userContext,
  };

  const payload = {
    contents: [
      { role: "user", parts: [{ text: sys }] },
      { role: "user", parts: [{ text: JSON.stringify(userPayload) }] },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.6,
      topK: 32,
      topP: 0.9,
    },
  };

  // Try a sequence of (endpoint, model) combos to dodge 404s.
  const tries: Array<{ endpoint: string; model: string; label: string }> = [
    { endpoint: endpoint0, model: model0, label: "as-configured" },
    // swap to v1
    {
      endpoint: "https://generativelanguage.googleapis.com/v1",
      model: model0,
      label: "v1-same-model",
    },
    // latest alias
    {
      endpoint: "https://generativelanguage.googleapis.com/v1",
      model: "models/gemini-1.5-pro-latest",
      label: "v1-pro-latest",
    },
    // flash (widely available)
    {
      endpoint: "https://generativelanguage.googleapis.com/v1",
      model: "models/gemini-1.5-flash",
      label: "v1-flash",
    },
    // v1beta versions too
    {
      endpoint: "https://generativelanguage.googleapis.com/v1beta",
      model: "models/gemini-1.5-pro-latest",
      label: "v1beta-pro-latest",
    },
    {
      endpoint: "https://generativelanguage.googleapis.com/v1beta",
      model: "models/gemini-1.5-flash",
      label: "v1beta-flash",
    },
  ];

  for (const t of tries) {
    try {
      if (DEBUG) console.log("[compare-gemini][try]", t.label, t.endpoint, t.model);
      const { res, raw } = await callGemini({ endpoint: t.endpoint, model: t.model, payload });

      if (res.ok) {
        const json = safeParse(raw) || {};
        const text =
          json?.candidates?.[0]?.content?.parts?.[0]?.text ||
          json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
          "";
        if (!text) return error(500, "Empty response from Gemini", { tried: t });

        let parsed = safeParse(text);
        if (!parsed) {
          const trimmed = String(text).trim();
          const start = trimmed.indexOf("{");
          const end = trimmed.lastIndexOf("}");
          if (start >= 0 && end > start) parsed = safeParse(trimmed.slice(start, end + 1));
        }
        if (!parsed)
          return error(500, "Failed to parse Gemini JSON", {
            tried: t,
            snippet: String(text).slice(0, 200),
          });

        if (DEBUG) console.log("[compare-gemini][success]", t.label);
        return NextResponse.json({ ok: true, data: parsed, used: t });
      }

      // If 404, immediately try the next combo; otherwise surface the error
      if (res.status !== 404) {
        return error(500, "Gemini error", {
          status: res.status,
          tried: t,
          detail: safeParse(raw) ?? raw,
        });
      }

      // continue loop on 404
      if (DEBUG) console.log("[compare-gemini][404-continue]", t.label);
    } catch (e: any) {
      // network or other failure: surface immediately
      return error(500, e?.message || "Request failed");
    }
  }

  // If we exhausted fallbacks:
  return error(500, "All Gemini fallbacks returned 404. Check API enablement & key scope.", {
    hint:
      "Open /api/compare-gemini?ping=1&model=models/gemini-1.5-pro-latest&endpoint=https://generativelanguage.googleapis.com/v1 to see the exact Google error. Ensure Generative Language API is enabled and your key restrictions allow server-side calls.",
  });
}
