// app/api/compare/ai/route.ts
import "server-only";
import { NextResponse } from "next/server";

// Force Node runtime to avoid any edge-bundling issues
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { compareBySlugs } from "@/lib/compare";
import { tryParseJson } from "@/lib/ai/json";
import { AiCompareSchema } from "@/lib/ai/schema-compare";

// Optional: centralize model + key
function getGeminiConfig() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY || // fallback if you used a different name
    "";
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY env var.");

  const model =
    process.env.GEMINI_MODEL?.trim() ||
    "models/gemini-1.5-flash";

  return { apiKey, model };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const slugs: string[] = Array.isArray(body?.slugs) ? body.slugs.slice(0, 3) : [];

    if (slugs.length < 2) {
      return NextResponse.json(
        { error: "Provide 2–3 tool slugs in the body: { slugs: [\"a\",\"b\", \"c?\"] }" },
        { status: 400 }
      );
    }

    // Dynamic import ensures webpack doesn’t try to bundle this for any client path
    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const { apiKey, model } = getGeminiConfig();
    const genAI = new GoogleGenerativeAI(apiKey);
    const client = genAI.getGenerativeModel({ model });

    // 1) Build a deterministic comparison matrix from your local data
    const matrix = await compareBySlugs(slugs);

    // 2) Build the prompt (your existing prompt file)
    const { buildPrompt } = await import("@/lib/ai/prompt-compare");
    const prompt = await buildPrompt(matrix);

    // 3) Call Gemini
    const result = await client.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    const text = result?.response?.text?.() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 }
      );
    }

    // 4) Parse to JSON (your helper) and validate against your schema
    const parsed = tryParseJson(text);
    const ok = AiCompareSchema.safeParse(parsed);

    if (!ok.success) {
      return NextResponse.json(
        {
          error: "Model output failed schema validation.",
          modelText: text,
          issues: ok.error.issues,
        },
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
