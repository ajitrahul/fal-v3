// lib/dev/lintData.ts
import { DB } from "@/lib/data";

export type DataWarning = {
  type:
    | "missing-name"
    | "missing-slug"
    | "duplicate-slug"
    | "invalid-website-url"
    | "invalid-docs-url"
    | "missing-icon"
    | "invalid-video-id"
    | "featured-flag-missing";
  slug?: string;
  name?: string;
  detail?: string;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function isHttpUrl(s: unknown): boolean {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function lintData(): { warnings: DataWarning[]; totals: Record<string, number> } {
  const tools: any[] = (DB.tools as any[]) ?? [];
  const warnings: DataWarning[] = [];

  // Missing name/slug
  for (const t of tools) {
    if (!t?.name || String(t.name).trim() === "") {
      warnings.push({ type: "missing-name", slug: t?.slug, name: t?.name, detail: "Tool has no name." });
    }
    if (!t?.slug || String(t.slug).trim() === "") {
      warnings.push({ type: "missing-slug", slug: t?.slug, name: t?.name, detail: "Tool has no slug." });
    }
  }

  // Duplicate slugs (case-insensitive)
  const seen = new Map<string, number>();
  for (const t of tools) {
    const k = String(t?.slug || "").toLowerCase();
    if (!k) continue;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [slug, count] of seen) {
    if (count > 1) warnings.push({ type: "duplicate-slug", slug, detail: `Slug appears ${count} times.` });
  }

  // Website / Docs URL format
  for (const t of tools) {
    const website = t?.website || t?.links?.website;
    const docs = t?.docs || t?.documentation || t?.official_docs || t?.links?.docs;
    if (website && !isHttpUrl(website)) {
      warnings.push({ type: "invalid-website-url", slug: t?.slug, name: t?.name, detail: String(website) });
    }
    if (docs && !isHttpUrl(docs)) {
      warnings.push({ type: "invalid-docs-url", slug: t?.slug, name: t?.name, detail: String(docs) });
    }
  }

  // Missing icon
  for (const t of tools) {
    const icon =
      t?.logo ||
      t?.icon ||
      t?.image ||
      t?.images?.logo ||
      t?.brand?.logo ||
      t?.avatar ||
      t?.thumbnail ||
      t?.og_image ||
      t?.banner ||
      t?.favicon ||
      null;
    if (!icon) {
      warnings.push({ type: "missing-icon", slug: t?.slug, name: t?.name, detail: "No recognizable icon field." });
    }
  }

  // Invalid YouTube video ID (official_video)
  for (const t of tools) {
    const vid = t?.official_video;
    if (vid && typeof vid === "string" && !YT_ID.test(vid)) {
      warnings.push({ type: "invalid-video-id", slug: t?.slug, name: t?.name, detail: `Invalid YouTube ID: ${vid}` });
    }
  }

  // Featured flag presence (if featured card relies on flags.featured === true)
  for (const t of tools) {
    const flags = t?.flags || {};
    if (t?.featured === true && flags?.featured !== true) {
      warnings.push({
        type: "featured-flag-missing",
        slug: t?.slug,
        name: t?.name,
        detail: "Tool has legacy `featured: true` but missing `flags.featured: true`.",
      });
    }
  }

  const totals = warnings.reduce<Record<string, number>>((acc, w) => {
    acc[w.type] = (acc[w.type] || 0) + 1;
    return acc;
  }, {});

  return { warnings, totals };
}
