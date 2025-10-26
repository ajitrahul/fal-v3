// lib/ai/prompt-compare.ts
// Prompt builder for AI tool comparison (Gemini). No external deps.

export type MatrixRow = {
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

export function buildComparePrompt(rows: MatrixRow[]) {
  // Single source of truth the model can use.
  const factsBlock = JSON.stringify(
    rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      from_price: r.from_price,
      has_free_tier: r.has_free_tier,
      has_api: r.has_api,
      is_open_source: r.is_open_source,
      models_count: r.models_count,
      modalities: r.modalities,
      sdk_count: r.sdk_count,
      integrations_count: r.integrations_count,
      security: r.security,
      best_for: r.best_for,
    })),
    null,
    2
  );

  return `
You are comparing up to three AI tools for a buyer. You are given only the structured FACTS below.
Base every statement on these facts. When something is unknown, say “Not enough data”.

FACTS (array of tools):
${factsBlock}

Return a single **JSON object** only (no prose outside JSON) that matches:

{
  "criteria": { "id": string; "label": string; "weight": number }[];  // 6-8 criteria; weights sum to ~1.0
  "scores": { [slug: string]: { [criteriaId: string]: 0|1|2|3|4|5 } };
  "analysis": {
    [slug: string]: {
      "strengths": string[];    // 3–6 short, FACT-based bullets, SPECIFIC to that tool (no duplicates across tools)
      "weaknesses": string[];   // 3–6 short, FACT-based bullets, SPECIFIC to that tool (no duplicates across tools)
      "notes"?: string;         // optional single sentence
    }
  };
  "verdict": {
    "best_overall"?: string;                  // slug
    "by_use_case"?: { "use_case": string; "slug": string }[]  // pick 1–4 relevant use cases based on 'best_for'
  };
  "final_recommendation": string; // 13–16 sentences: clearly name winner(s) and trade-offs; grounded in FACTS
}

GUIDELINES:
- Prefer contrasts: free tier vs none, multimodal vs text-only, #SDKs/integrations, encryption/certs present vs missing.
- Keep bullets concise and free of hype. No markdown.
- NEVER return empty arrays; if little data, use “Not enough data” but still give at least 3 items per list.
- If two tools are similar, spell out what actually differs (price hint, modalities, API, SDK count, integrations count).
- Ensure the JSON is valid and complete.

Now output ONLY the JSON object, no extra text.
`.trim();
}
