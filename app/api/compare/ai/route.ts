// app/api/compare/ai/route.ts
import "server-only";
import { NextResponse } from "next/server";

// Force Node runtime (NOT edge) so the SDK can run in a Node context
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { compareBySlugs } from "@/lib/compare";
import { tryParseJson } from "@/lib/ai/json";
import { AiCompareSchema } from "@/lib/ai/schema-compare";

// Config from env
function getGeminiConfig() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY || // fallback if you used a different name
    "";
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY env var.");

  const model = (process.env.GEMINI_MODEL || "models/gemini-1.5-flash").trim();
  return { apiKey, model };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const slugs: string[] = Array.isArray(body?.slugs) ? body.slugs.slice(0, 3) : [];

    if (slugs.length < 2) {
      return NextResponse.json(
        { error: 'Provide 2–3 tool slugs: { "slugs": ["slug1","slug2","slug3?"] }' },
        { status: 400 }
      );
    }

    // ✅ DYNAMIC IMPORT — prevents bundler from resolving at build time
    let GoogleGenerativeAI: any;
    try {
      ({ GoogleGenerativeAI } = await import("@google/generative-ai"));
    } catch (e: any) {
      return NextResponse.json(
        {
          error:
            "Gemini SDK not installed or resolvable. Run: npm i @google/generative-ai",
          detail: String(e?.message || e),
        },
        { status: 500 }
      );
    }

    const { apiKey, model } = getGeminiConfig();
    const genAI = new GoogleGenerativeAI(apiKey);
    const client = genAI.getGenerativeModel({ model });

    // 1) Deterministic matrix from local data
    const matrix = await compareBySlugs(slugs);

    // 2) Prompt for AI (your existing prompt builder)
    const { buildPrompt } = await import("@/lib/ai/prompt-compare");
    const prompt = await buildPrompt(matrix);

    // 3) Call Gemini
    const result = await client.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    });

    const text = result?.response?.text?.() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 }
      );
    }

    // 4) Parse/validate
    const parsed = tryParseJson(text);
    const ok = AiCompareSchema.safeParse(parsed);
    if (!ok.success) {
      return NextResponse.json(
        { error: "Model output failed schema validation.", modelText: text, issues: ok.error.issues },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, data: ok.data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error in compare AI route." },
      { status: 500 }
    );
  }
}
