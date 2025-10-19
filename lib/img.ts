// lib/img.ts
/**
 * Small helpers to pick a valid logo URL from a tool record.
 * We look across common fields (logo_url, icon_url, logo, icon, images[], gallery[])
 * and finally fallback to a site favicon if website_url exists.
 */

function firstNonEmpty(...vals: Array<unknown>): string | null {
  for (const v of vals) {
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) continue;
      const low = s.toLowerCase();
      if (low === "n/a" || low === "na" || low === "null" || low === "undefined") continue;
      // normalize protocol-relative URLs
      return s.startsWith("//") ? `https:${s}` : s;
    }
    // object with { src }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const src = (v as any).src;
      if (typeof src === "string" && src.trim()) return src.trim();
    }
    // arrays of strings or {src}
    if (Array.isArray(v)) {
      for (const it of v) {
        const found = firstNonEmpty(it);
        if (found) return found;
      }
    }
  }
  return null;
}

export function pickLogo(tool: any): string | null {
  if (!tool || typeof tool !== "object") return null;

  // Gather candidates in priority order
  const candidates: Array<unknown> = [
    tool.logo_url,
    tool.icon_url,
    tool.logo,
    tool.icon,
    tool.images,   // can be: string[] or [{src, caption}]
    tool.gallery,  // can be: string[] or [{src, caption}]
  ];

  // Fallback: vendor favicon from website_url
  if (typeof tool.website_url === "string" && tool.website_url.trim()) {
    try {
      const u = new URL(tool.website_url);
      candidates.push(`https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`);
    } catch {
      // ignore bad URL
    }
  }

  return firstNonEmpty(...candidates);
}
