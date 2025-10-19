// lib/youtube.ts
export function extractYouTubeId(input?: string | null): string | null {
  if (!input) return null;
  const url = input.trim();
  const idLike = /^[a-zA-Z0-9_-]{8,}$/;

  if (idLike.test(url) && !url.includes("/") && !url.includes("?")) return url;

  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return idLike.test(id) ? id : null;
    }
    const isYT = u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com");
    if (isYT) {
      if (u.pathname === "/watch") {
        const v = u.searchParams.get("v");
        return v && idLike.test(v) ? v : null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live")) {
        const id = parts[1];
        return idLike.test(id) ? id : null;
      }
    }
  } catch { /* fallthrough */ }

  return null;
}

export function buildNoCookieEmbedUrl(
  videoId: string,
  opts?: { playsinline?: boolean; rel?: 0 | 1 }
) {
  const pl = opts?.playsinline === false ? 0 : 1;
  const rel = typeof opts?.rel === "number" ? opts.rel : 0;
  const params = new URLSearchParams({ playsinline: String(pl), rel: String(rel) });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}
