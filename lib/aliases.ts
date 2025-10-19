// lib/aliases.ts
import { DB } from "@/lib/data";

/** Build alias -> canonical slug map from DB. */
export function buildAliasIndexFromDB(): Record<string, string> {
  const aliasIndex: Record<string, string> = {};
  const tools = (DB.tools as any[]) ?? [];

  for (const t of tools) {
    const canonical = String(t.slug || "").toLowerCase();
    if (!canonical) continue;
    aliasIndex[canonical] = canonical;

    const candidates = []
      .concat(t.aliases ?? [])
      .concat(t.alt_slugs ?? [])
      .concat(t.short_slug ? [t.short_slug] : [])
      .concat(t.slug_short ? [t.slug_short] : [])
      .concat(t.short ? [t.short] : [])
      .concat(t.abbrev ? [t.abbrev] : []);

    for (const a of candidates) {
      if (typeof a === "string" && a.trim()) {
        aliasIndex[a.trim().toLowerCase()] = canonical;
      }
    }
  }

  // Optional: a few hand-curated short-hands (only if canonical exists)
  const canonicals = new Set<string>(tools.map((t) => String(t.slug || "").toLowerCase()));
  const addIf = (alias: string, target: string) => {
    const t = target.toLowerCase();
    if (canonicals.has(t)) aliasIndex[alias.toLowerCase()] = t;
  };
  addIf("gcp-speech", "google-cloud-speech-to-text");
  addIf("gcp-tts", "google-cloud-text-to-speech");
  addIf("gcp-vision", "google-cloud-vision");
  addIf("gcp-translate", "google-cloud-translate");

  return aliasIndex;
}

/** Return canonical slug if known; otherwise null. */
export function resolveCanonicalSlug(input: string): string | null {
  if (!input) return null;
  const idx = buildAliasIndexFromDB();
  const key = String(input).toLowerCase();
  return idx[key] ?? null;
}
