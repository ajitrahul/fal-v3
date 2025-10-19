// lib/featured.ts
// Deterministic, STRICT featured selection.
// Only include tools where flags.featured === true (or legacy top-level featured === true).
// We still attach __videoId when resolvable so callers can decide how to render.

import { extractYouTubeId } from "@/lib/youtube";

export type Tool = {
  slug: string;
  name?: string;
  weight?: number;
  // Preferred location
  flags?: { featured?: boolean | null } | null;
  // Legacy support (some old JSONs used top-level "featured")
  featured?: boolean | null;
  // official_video can be a string or an object with youtube/url
  official_video?:
    | string
    | {
        url?: string | null;
        youtube?: string | null;
        [k: string]: any;
      };
};

function isFeatured(t: Tool): boolean {
  // STRICT: only true counts; missing/false is excluded
  return t?.flags?.featured === true || t?.featured === true;
}

function getOfficialVideoId(tool: Tool): string | null {
  const ov = tool.official_video;
  let src: string | null = null;

  if (typeof ov === "string") {
    src = ov;
  } else if (ov && typeof ov === "object") {
    // Support both "youtube" and "url"
    src = ov.youtube || ov.url || null;
  }

  return extractYouTubeId(src ?? null);
}

/**
 * Returns up to `limit` STRICTLY featured tools prioritized by:
 *  1) weight (desc)
 *  2) slug (asc)
 * Each item carries __videoId when resolvable (may be undefined).
 */
export function getFeaturedTools<T extends Tool>(
  all: T[],
  limit = 3
): Array<T & { __videoId?: string }> {
  // 1) Filter STRICT featured
  const feat = all.filter(isFeatured);

  // 2) Attach video id (optional)
  const enriched = feat.map((t) => {
    const vid = getOfficialVideoId(t) || undefined;
    return Object.assign({}, t, { __videoId: vid });
  });

  // 3) Stable sort: weight DESC, slug ASC
  enriched.sort((a, b) => {
    const wa = a.weight ?? 0;
    const wb = b.weight ?? 0;
    if (wa !== wb) return wb - wa;
    return a.slug.localeCompare(b.slug);
  });

  // 4) Limit
  return enriched.slice(0, limit);
}
