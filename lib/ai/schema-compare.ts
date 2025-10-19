// lib/ai/schema-compare.ts
import { z } from "zod";

export const AiCompareSchema = z.object({
  overview: z.string().min(1).describe("Short neutral overview of the tools compared."),
  key_differences: z.array(z.string()).default([]),
  strengths: z.record(z.string(), z.array(z.string()).default([])).default({}),
  best_for: z.array(z.object({
    audience: z.string(),
    pick: z.string(),
    why: z.string()
  })).default([]),
  considerations: z.array(z.string()).default([]),
  data_used: z.array(z.string()).default([]), // which fields from the payload were used
  confidence: z.enum(["low", "medium", "high"]).default("medium")
});

export type AiCompare = z.infer<typeof AiCompareSchema>;
