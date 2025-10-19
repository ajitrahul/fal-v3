import type { Tool } from '@/lib/types';

const STOP = new Set([
  'the','a','an','and','or','for','of','to','in','on','with','by','at','from','into','via'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOP.has(t));
}

function vectorize(tool: Tool): Map<string, number> {
  const v = new Map<string, number>();

  const bump = (token: string, w: number) => {
    v.set(token, (v.get(token) || 0) + w);
  };

  // Categories & tasks are strong signals
  for (const c of tool.categories) bump(`cat:${c}`, 3);
  for (const t of tool.tasks) bump(`task:${t}`, 3);

  // Features & models moderate
  for (const f of tool.features || []) for (const t of tokenize(f)) bump(`feat:${t}`, 1);
  for (const m of tool.models || []) bump(`model:${m.toLowerCase()}`, 2);

  // Name & tagline light
  for (const t of tokenize(tool.name)) bump(`name:${t}`, 1);
  for (const t of tokenize(tool.tagline || '')) bump(`tag:${t}`, 1);

  return v;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [, va] of a) na += va * va;
  for (const [, vb] of b) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  // Iterate the shorter map for speed
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  for (const [k, vs] of s) {
    const vl = l.get(k);
    if (vl) dot += vs * vl;
  }
  return dot / denom;
}

export function topAlternatives(base: Tool, all: Tool[], limit = 6): Tool[] {
  const vBase = vectorize(base);
  return all
    .filter(t => t.slug !== base.slug)
    .map(t => ({ t, s: cosine(vBase, vectorize(t)) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map(x => x.t);
}
