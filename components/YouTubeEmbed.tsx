// components/YouTubeEmbed.tsx
"use client";
import { useMemo } from "react";

export default function YouTubeEmbed({
  url,
  className,
  title = "Video",
}: {
  url?: string | null;
  className?: string;
  title?: string;
}) {
  const id = useMemo(() => extractId(url), [url]);
  if (!id) return null;
  return (
    <div className={className}>
      <div className="aspect-video w-full bg-black overflow-hidden rounded-t-2xl">
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}

function extractId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const raw = url.trim();
    // /embed/ID
    const em = raw.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (em?.[1]) return em[1];
    // watch?v=ID (schema enforces this pattern)
    const wm = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (wm?.[1]) return wm[1];
    // youtu.be/ID
    const sm = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (sm?.[1]) return sm[1];
  } catch {}
  return null;
}
