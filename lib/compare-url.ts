// lib/compare-url.ts
export const COMPARE_QS_KEY = "tools";

export function parseCompareParam(v: string | null | undefined): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function serializeCompareParam(slugs: string[]): string {
  const normalized = slugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const uniq = Array.from(new Set(normalized));
  // Stable order for shareability (A..Z)
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq.join(",");
}

export function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const A = new Set(a.map((x) => x.toLowerCase()));
  for (const x of b) if (!A.has(x.toLowerCase())) return false;
  return true;
}
