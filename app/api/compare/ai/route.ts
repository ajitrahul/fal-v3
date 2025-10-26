// app/api/compare/ai/route.ts
import "server-only";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { compareBySlugs } from "@/lib/compare";
import { tryParseJson } from "@/lib/ai/json";
import { AiCompareSchema } from "@/lib/ai/schema-compare";

function getGeminiConfig() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY || // allow either name
    "";
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY).");

  let model = (process.env.GEMINI_MODEL || "models/gemini-1.5-flash").trim();
  if (!model.startsWith("models/")) model = `models/${model}`;

  return { apiKey, model };
}

async function callGeminiREST(prompt: string) {
  const { apiKey, model } = getGeminiConfig();

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // @ts-ignore: next cache control
    next: { revalidate: 0 },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Gemini HTTP ${res.status}: ${text || res.statusText || "Unknown error"}`
    );
  }

  const data = await res.json();
  // Extract text safely
  let text = "";
  try {
    const parts =
      data?.candidates?.[0]?.content?.parts ??
      data?.candidates?.[0]?.content?.parts ??
      [];
    text = parts.map((p: any) => p?.text || "").join("").trim();
  } catch {
    // ignore
  }
  if (!text) text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text) {
    throw new Error("Empty response from Gemini.");
  }
  return text;
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

    // 1) Deterministic matrix from your local repo data
    const matrix = await compareBySlugs(slugs);

    // 2) Build prompt from your existing helper
    const { buildPrompt } = await import("@/lib/ai/prompt-compare");
    const prompt = await buildPrompt(matrix);

    // 3) Call Gemini via REST (no SDK)
    const modelText = await callGeminiREST(prompt);

    // 4) Parse and validate against your schema
    const parsed = tryParseJson(modelText);
    const check = AiCompareSchema.safeParse(parsed);

    if (!check.success) {
      return NextResponse.json(
        { error: "Model output failed schema validation.", modelText, issues: check.error.issues },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, data: check.data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error in compare AI route." },
      { status: 500 }
    );
  }
}
