// app/api/compare/ai/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { compareBySlugs } from "@/lib/compare";
import { tryParseJson } from "@/lib/ai/json";
import { AiCompareSchema } from "@/lib/ai/schema-compare";
import { buildAiComparePrompt } from "@/lib/ai/prompt-compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, msg: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

function parseSlugsParam(s: string | null) {
  if (!s) return [];
  return Array.from(new Set(s.split(/[,\|]/g).map(x => x.trim()).filter(Boolean))).slice(0, 3);
}

function modelCandidatesFromEnv(): string[] {
  const envVal = (process.env.AI_COMPARE_MODEL || "").trim();
  if (envVal) return envVal.split(/[,\s]+/g).map(s => s.trim()).filter(Boolean);
  // Reasonable fallbacks across API versions; first that works wins.
  return [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
  ];
}

async function runAI(slugs: string[], debug = false) {
  const cmp = compareBySlugs(slugs);
  if (!cmp.raw.length) return bad(404, "No tools matched the provided slugs", { slugs });

  // Mock mode (quick sanity check without external call)
  if (process.env.AI_COMPARE_MOCK === "1") {
    return NextResponse.json({
      ok: true,
      slugs: cmp.slugs,
      names: cmp.names,
      ai: {
        overview: `Comparison of ${cmp.names.join(" vs ")} based on your catalog.`,
        key_differences: ["Feature coverage", "Pricing model", "Target roles"],
        strengths: Object.fromEntries(cmp.names.map((n) => [n, ["Strong ecosystem", "Mature docs"]])),
        best_for: cmp.names.map((n) => ({ audience: "General users", pick: n, why: "Balanced features" })),
        considerations: ["Verify pricing on vendor site.", "Check integration needs."],
        data_used: ["features", "pricing_model", "roles", "use_cases"],
        confidence: "medium",
      },
      base: { slugs: cmp.slugs, names: cmp.names, fields: cmp.fields },
      note: "AI_COMPARE_MOCK=1 (no external model call).",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return bad(500, "GEMINI_API_KEY is not configured");

  // Build grounded prompt and send as a single string (avoids role/parts shape issues)
  const payload = { slugs: cmp.slugs, names: cmp.names, fields: cmp.fields };
  const prompt = buildAiComparePrompt(payload, slugs);
  const finalText = `SYSTEM:\n${prompt.system}\n\nUSER:\n${prompt.user}`;

  const genai = new GoogleGenerativeAI(apiKey);
  const candidates = modelCandidatesFromEnv();
  const errors: Array<{ model: string; message: string }> = [];

  let chosenModel = "";
  let rawText = "";

  for (const modelName of candidates) {
    try {
      const model = genai.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      // ✅ Use simple string prompt to avoid JSON shape mismatches
      const res = await model.generateContent(finalText);
      rawText = res.response.text();
      chosenModel = modelName;
      break;
    } catch (e: any) {
      const msg = e?.message || String(e);
      errors.push({ model: modelName, message: msg });
      if (debug) console.warn("[/api/compare/ai] model failed:", modelName, msg);
      continue;
    }
  }

  if (!chosenModel) {
    return bad(502, "All model candidates failed", {
      tried: candidates,
      errors,
      hint:
        "Set AI_COMPARE_MODEL to a model available to your key, e.g. 'gemini-2.0-flash' or 'gemini-1.5-flash-latest'.",
    });
  }

  const parsed = tryParseJson(rawText);
  if (!parsed) {
    if (debug) console.warn("[/api/compare/ai] Non-JSON model output:", rawText);
    return NextResponse.json({ ok: true, model: chosenModel, note: "Model returned non-JSON; returning raw.", raw: rawText, base: payload });
  }

  const result = AiCompareSchema.safeParse(parsed);
  if (!result.success) {
    if (debug) console.warn("[/api/compare/ai] JSON failed schema:", result.error.issues);
    return NextResponse.json({ ok: true, model: chosenModel, note: "Model JSON did not match schema; returning raw + issues.", issues: result.error.issues, raw: parsed, base: payload });
  }

  return NextResponse.json(
    { ok: true, slugs: cmp.slugs, names: cmp.names, ai: result.data, base: payload, model: chosenModel },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slugs = parseSlugsParam(searchParams.get("slugs"));
  const debug = searchParams.get("debug") === "1";
  if (!slugs.length) return bad(400, "Provide ?slugs=a,b[,c]");
  return runAI(slugs, debug);
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug") === "1";
  let slugs: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.slugs)) slugs = body.slugs.map((s: any) => String(s));
    else if (typeof body?.slugs === "string") slugs = parseSlugsParam(body.slugs);
  } catch {
    // ignore
  }
  if (!slugs.length) return bad(400, "POST body: { slugs: string[] | string }");
  return runAI(slugs, debug);
}
