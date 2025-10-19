import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export type CompareOptions = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  format?: 'json'|'markdown';
  weights?: { accuracy?: number; cost?: number; speed?: number; integrations?: number };
  cacheTtlDays?: number;
};

export type CompareRequest = { ids: string[], format?: 'json'|'markdown' };

export type ToolLite = {
  slug: string;
  name: string;
  tagline?: string;
  pricing?: any;
  features?: string[];
  platforms?: string[];
  models?: string[];
  integrations?: string[];
  categories?: string[];
  tasks?: string[];
  vendor?: { name?: string; hq_country?: string };
  updated_at?: string;
  website_url?: string;
};

export function pickLite(t: any): ToolLite {
  return {
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    pricing: t.pricing,
    features: t.features,
    platforms: t.platforms,
    models: t.models,
    integrations: t.integrations,
    categories: t.categories,
    tasks: t.tasks,
    vendor: t.vendor,
    updated_at: t.updated_at,
    website_url: t.website_url,
  };
}

export function hashRequest(tools: ToolLite[], opts: CompareOptions){
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify({ tools, opts }));
  return h.digest('hex').slice(0, 24);
}

export async function readCache(key: string){
  try {
    const p = path.join(process.cwd(), 'data', 'ai-cache', key + '.json');
    const raw = await fs.readFile(p, 'utf-8');
    const obj = JSON.parse(raw);
    return obj;
  } catch { return null; }
}

export async function writeCache(key: string, payload: any){
  try {
    const dir = path.join(process.cwd(), 'data', 'ai-cache');
    await fs.mkdir(dir, { recursive: true });
    const p = path.join(dir, key + '.json');
    await fs.writeFile(p, JSON.stringify(payload, null, 2));
  } catch {}
}

export function buildSystemPrompt(opts?: CompareOptions){
  const w = opts?.weights || { accuracy: 0.4, cost: 0.25, speed: 0.2, integrations: 0.15 };
  return `You are an unbiased analyst. Write in a concise, helpful, credible tone. Avoid hype.
Prioritize dimensions with these weights (sum=1): Accuracy ${w.accuracy}, Cost ${w.cost}, Speed ${w.speed}, Integrations ${w.integrations}.
Only use the provided tool data; do not invent features or pricing. If uncertain, state limitations.`;
}

export function buildUserPrompt(tools: ToolLite[], format: 'json'|'markdown'){
  const catalog = tools.map(t => ({
    slug: t.slug, name: t.name, tagline: t.tagline,
    pricing: t.pricing, features: t.features, platforms: t.platforms,
    models: t.models, integrations: t.integrations, categories: t.categories,
    tasks: t.tasks, vendor: t.vendor, updated_at: t.updated_at, website_url: t.website_url
  }));
  if (format === 'json') {
    return `Compare these tools in depth and return STRICT JSON (no markdown). 
Schema:
{
  "tldr": ["bullet", "..."],
  "dimensions": [
    {"name":"Accuracy","verdicts":[{"tool":"slug","score":1-5,"evidence":"concise, specific"}]}
  ],
  "pros_cons":[{"tool":"slug","pros":["..."],"cons":["..."]}],
  "who_should_choose":[{"persona":"role/title","pick":"slug","why":"specific"}],
  "decision_matrix":[{"criterion":"text","best":"slug","reason":"why this pick"}],
  "caveats":["clear limitations and unknowns"]
}
Catalog JSON:\n${JSON.stringify(catalog)}`;
  }
  return `Create a detailed, structured markdown comparison with:
- TL;DR bullets (3–5)
- Table across key dimensions (Accuracy, Cost, Speed, Integrations)
- Pros & Cons per tool
- Who should choose what (personas, use cases)
- Decision matrix (if X then choose Y, with reasons)
- Caveats/unknowns
Catalog JSON:\n${JSON.stringify(catalog)}`;
}
