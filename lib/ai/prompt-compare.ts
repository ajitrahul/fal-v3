// lib/ai/prompt-compare.ts
// Grounded prompt for AI comparison, aligned to your tools schema.
// Output shape stays consistent for your route's validator.

type FieldsBySlug = Record<string, any>;

export type ComparePayload = {
  slugs: string[];        // tool slugs in request order
  names: string[];        // human-readable tool names in the same order
  fields: FieldsBySlug;   // { [slug]: toolJsonEntry }
};

// Axes aligned to your tools schema (incl. two derived axes from technical_information).
const SCHEMA_ALIGNED_AXES = [
  "key_differentiator",
  "pros",
  "cons",
  "best_for",
  "use_cases",
  "pricing_plans",
  "company_details",
  "models",
  "technical_information",
  "security",        // derived from technical_information.security
  "integrations",    // derived from technical_information.integrations
  "flags",
  "case_studies",
  "reviews_and_ratings",
  "tutorials_youtube",
  "official_video",
  "vendor_details",
];

// Output shape the route expects:
//
// {
//   overview: string,
//   key_differences: string[],
//   strengths: Record<string /* tool name */, string[]>,
//   best_for: Array<{ audience: string, pick: string, why: string }>,
//   considerations: string[],
//   data_used: string[],
//   confidence: "low" | "medium" | "high"
// }

function buildExample(names: string[]) {
  const a = names[0] ?? "Tool A";
  const b = names[1] ?? "Tool B";
  return JSON.stringify(
    {
      overview:
        `${a} focuses on quick onboarding and native integrations; ${b} emphasizes customization and API breadth.`,
      key_differences: [
        `${a}: simpler pricing tiers vs ${b}: granular enterprise plans`,
        `${a}: richer tutorials; ${b}: broader SDK/language support`,
        `${a}: limited compliance claims; ${b}: more certifications listed`,
      ],
      strengths: {
        [a]: ["Fast setup", "Good docs/tutorials", "Lower entry cost"],
        [b]: ["Deep API/SDK", "Flexible hosting", "Enterprise support options"],
      },
      best_for: [
        { audience: "Solo/SMB teams", pick: a, why: "Quick adoption and budget friendly" },
        { audience: "Enterprise/platform teams", pick: b, why: "Customization + integrations depth" },
      ],
      considerations: [
        `${a}: fewer compliance details available`,
        `${b}: steeper learning curve; premium features gated`,
      ],
      data_used: ["pros", "cons", "pricing_plans", "technical_information", "tutorials_youtube", "security"],
      confidence: "medium",
    },
    null,
    0
  );
}

export function buildAiComparePrompt(
  payload: ComparePayload,
  requestedSlugs?: string[]
): { system: string; user: string } {
  const { slugs, names, fields } = payload;
  const example = buildExample(names);

  const system = [
    "You are an impartial product analyst.",
    "Use ONLY the provided tool JSON fields. Do NOT invent facts.",
    "If a field is missing/empty for a tool, treat it as unknown.",
    "Return STRICT JSON using the exact shape described; no Markdown or extra text.",
  ].join("\n");

  const userLines: string[] = [];
  userLines.push("TASK: Compare the following AI tools using these schema-aligned axes.");
  userLines.push("");
  userLines.push(`Tools (slugs → names): ${slugs.map((s, i) => `${s} → ${names[i] || s}`).join(" | ")}`);
  userLines.push(`Requested slugs: ${(requestedSlugs && requestedSlugs.length ? requestedSlugs : slugs).join(", ")}`);
  userLines.push(`Axes (ordered): ${SCHEMA_ALIGNED_AXES.join(", ")}`);
  userLines.push("");
  userLines.push("Tool JSON (by slug):");
  userLines.push(JSON.stringify(fields));
  userLines.push("");
  userLines.push("OUTPUT SHAPE (EXACT KEYS, STRICT TYPES):");
  userLines.push(`{
  "overview": string,
  "key_differences": string[],
  "strengths": Record<string, string[]>,
  "best_for": Array<{ "audience": string, "pick": string, "why": string }>,
  "considerations": string[],
  "data_used": string[],
  "confidence": "low" | "medium" | "high"
}`);
  userLines.push("");
  userLines.push("RULES:");
  userLines.push("- For `strengths`, object keys MUST be the exact tool NAMES (not slugs).");
  userLines.push("- For `best_for`, include 1–3 succinct entries.");
  userLines.push("- For `key_differences`, list 3–6 short bullets that truly distinguish the tools.");
  userLines.push("- For `considerations`, mention gaps/unknowns (e.g., pricing/compliance missing).");
  userLines.push(`- For "data_used", pick only the axes you actually referenced: ${SCHEMA_ALIGNED_AXES.join(", ")}.`);
  userLines.push("- Use only the provided JSON; if unknown, do not guess.");
  userLines.push("- Keep total text concise (~300–350 words).");
  userLines.push("");
  userLines.push("EXAMPLE (FORMAT GUIDE ONLY; DO NOT COPY CONTENT):");
  userLines.push(example);
  userLines.push("");
  userLines.push("Return ONLY the JSON object.");

  return { system, user: userLines.join("\n") };
}
