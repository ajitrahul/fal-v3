// app/api/compare/ai/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildComparePrompt } from "@/lib/ai/prompt-compare";
import { readFile } from "fs/promises";
import path from "path";

type Tool = {
  slug: string;
  name: string;
  category?: string;
  description?: string;
  website_url?: string;
  pricing_plans?: Array<{ name?: string; price?: string | number; billing_cycle?: string; currency?: string }>;
  flags?: { has_free_tier?: boolean; has_api?: boolean; is_open_source?: boolean };
  models?: Array<{ modality?: string; provider?: string }>;
  technical_information?: {
    integrations?: string[];
    sdk_languages?: string[];
    security?: { encryption_at_rest?: boolean; encryption_in_transit?: boolean; compliance_certifications?: string[] };
  };
  best_for?: string[];
  logo_url?: string;
};

function fromPrice(t: Tool) {
  const plans = Array.isArray(t.pricing_plans) ? t.pricing_plans : [];
  for (const p of plans) {
    const v = p?.price;
    if (v === 0 || v === "0" || String(v).toLowerCase() === "free") return "0";
    if (typeof v === "number" && !Number.isNaN(v)) {
      const cycle = p?.billing_cycle ? `/${p.billing_cycle}` : "";
      const cur = p?.currency ? ` ${p.currency}` : "";
      return `${v}${cur}${cycle}`;
    }
    if (typeof v === "string" && v.trim()) {
      const cycle = p?.billing_cycle ? `/${p.billing_cycle}` : "";
      return `${v}${cycle}`;
    }
  }
  return "See pricing page/monthly";
}

async function loadTool(slug: string): Promise<Tool | null> {
  try {
    const file = path.join(process.cwd(), "data", "tools", `${slug}.json`);
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slugsParam = url.searchParams.get("slugs") || url.searchParams.get("tools") || "";
    const slugs = slugsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (slugs.length === 0) {
      return NextResponse.json({ ok: false, error: "No slugs provided." }, { status: 400 });
    }

    // 1) Deterministic matrix derived from local JSONs
    const tools: Tool[] = (await Promise.all(slugs.map(loadTool))).filter(Boolean) as Tool[];

    if (tools.length === 0) {
      return NextResponse.json({ ok: false, error: "No tools found for given slugs." }, { status: 404 });
    }

    const matrix = tools.map((t) => ({
      slug: t.slug,
      name: t.name,
      category: String(t.category || "uncategorized"),
      from_price: fromPrice(t),
      has_free_tier: Boolean(t.flags?.has_free_tier),
      has_api: Boolean(t.flags?.has_api),
      is_open_source: Boolean(t.flags?.is_open_source),
      models_count: Array.isArray(t.models) ? t.models.length : 0,
      modalities: Array.isArray(t.models) ? Array.from(new Set(t.models.map((m) => (m.modality || "").toLowerCase()).filter(Boolean))) : [],
      sdk_count: t.technical_information?.sdk_languages?.length || 0,
      integrations_count: t.technical_information?.integrations?.length || 0,
      security: {
        encryption:
          Boolean(t.technical_information?.security?.encryption_at_rest) ||
          Boolean(t.technical_information?.security?.encryption_in_transit),
        certifications: t.technical_information?.security?.compliance_certifications || [],
      },
      best_for: Array.isArray(t.best_for) ? t.best_for : [],
    }));

    // 2) AI (Gemini) — with small temperature switch & JSON response hint
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    // Tunables (small, safe defaults)
    const temperature = Number(process.env.GEMINI_TEMPERATURE ?? "0.35");
    const topP = Number(process.env.GEMINI_TOP_P ?? "0.95");
    const topK = Number(process.env.GEMINI_TOP_K ?? "40");
    const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? "2048");

    let ai: any = undefined;
    let ai_error: string | undefined = undefined;
    let promptChars = 0;

    if (apiKey) {
      try {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature,
            topP,
            topK,
            maxOutputTokens,
            // Strongly nudge JSON output to avoid minimal/garbled text
            responseMimeType: "application/json",
          },
        });

        const prompt = buildComparePrompt(matrix);
        promptChars = prompt.length;

        // With generationConfig on the model, a plain string prompt is OK.
        const resp = await model.generateContent(prompt);

        // Prefer the library's text() helper; fall back to candidate parts if needed.
        const raw = resp.response?.text?.() || resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Strip accidental code fences and parse
        const jsonLike = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
        try {
          const parsed = JSON.parse(jsonLike);
          ai = parsed && typeof parsed === "object" ? parsed : undefined;
          if (!ai) ai_error = "AI returned non-object JSON.";
        } catch (e: any) {
          ai_error = `AI JSON parse failed: ${e?.message || String(e)}`;
        }
      } catch (e: any) {
        ai_error = `Gemini error: ${e?.message || String(e)}`;
      }
    } else {
      ai_error = "GEMINI_API_KEY not set; skipping AI analysis.";
    }

    return NextResponse.json({ ok: true, matrix, ai, promptChars, ai_error });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Server error.", detail: e?.message || String(e) }, { status: 500 });
  }
}
