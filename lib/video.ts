// lib/video.ts
// Helpers for extracting a playable, embeddable video URL for a tool.

export type VideoInfo = { src: string; title?: string | null };

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseYouTubeId(input: string): string | null {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    // Accept common YouTube hosts
    const isYT =
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com";
    if (!isYT) return null;

    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return id || null;
    }

    // watch?v=<id>
    const vid = url.searchParams.get("v");
    if (vid) return vid;

    // /embed/<id>, /shorts/<id>, /v/<id>
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];

    return null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(href: string): string | null {
  const id = parseYouTubeId(href);
  if (!id) return null;
  // Use nocookie domain; keep it simple & mobile friendly
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

/**
 * Picks the best available video for a tool, normalizing to an embeddable URL.
 * Priority:
 *  1) tool.official_video.youtube or .url (if YouTube)
 *  2) tool.tutorials[].youtube | .url_youtube | .url (if YouTube)
 *  3) tool.links.youtube (if present)
 */
export function getVideoForTool(tool: any): VideoInfo | null {
  // 1) official video
  const ov = tool?.official_video || null;
  const candidates: { href?: string; title?: string | null }[] = [];

  if (ov) {
    const fromOv = toStr(ov.youtube || ov.url || "");
    if (fromOv) candidates.push({ href: fromOv, title: ov.title || null });
  }

  // 2) tutorials fallback
  if (Array.isArray(tool?.tutorials)) {
    for (const t of tool.tutorials) {
      const fromT = toStr(t?.youtube || t?.url_youtube || t?.url || "");
      if (fromT) candidates.push({ href: fromT, title: t?.title || null });
    }
  }

  // 3) generic link
  if (tool?.links?.youtube) {
    candidates.push({ href: toStr(tool.links.youtube), title: null });
  }

  // Return first embeddable YouTube candidate
  for (const c of candidates) {
    const embed = c.href ? youtubeEmbedUrl(c.href) : null;
    if (embed) {
      return {
        src: embed,
        title: c.title || tool?.name || "Video",
      };
    }
  }

  return null;
}
