// components/FeaturedStrip.tsx
import Link from "next/link";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { DB } from "@/lib/data";
import { getFeaturedTools } from "@/lib/featured";

/** Build a YouTube thumbnail URL for a given video id. */
function ytThumb(videoId: string) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

/** Normalize an arbitrary value to a usable URL or null. */
function asUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "n/a" || low === "na" || low === "null" || low === "undefined") return null;
  return s.startsWith("//") ? `https:${s}` : s;
}

/** Pick a reasonable poster/logo for a tool when there is no video. */
function pickLogoUrl(tool: any): string | null {
  const direct =
    asUrl(tool?.logo_url) || asUrl(tool?.icon_url) || asUrl(tool?.logo) || asUrl(tool?.icon);
  if (direct) return direct;

  const arrays: unknown[] = [tool?.images, tool?.gallery];
  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === "string") {
          const u = asUrl(it);
          if (u) return u;
        } else if (it && typeof it === "object" && "src" in (it as any)) {
          const u = asUrl((it as any).src);
          if (u) return u;
        }
      }
    }
  }

  const site = asUrl(tool?.website_url);
  if (site) {
    try {
      const u = new URL(site);
      return `https://www.google.com/s2/favicons?sz=128&domain=${u.hostname}`;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export default function FeaturedStrip() {
  const tools = DB.tools as any[];
  const featured = getFeaturedTools(tools, 3);

  return (
    <section
      id="featured-tools"
      aria-labelledby="featured-tools-title"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <h2 id="featured-tools-title" className="mb-4 text-lg font-semibold">
        Featured Tutorials
      </h2>

      {/* 2-up on small, 3-up from md */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {featured.map((item) => {
          const videoId = (item as any).__videoId as string | undefined;
          const name = item.name ?? item.slug;

          // Card wrapper is relative so our overlay link can cover it
          return (
            <article
              key={item.slug}
              className="relative overflow-hidden rounded-xl border border-gray-200 hover:shadow-md focus-within:ring-2 focus-within:ring-black/60"
            >
              {/* Full-card overlay link (captures clicks everywhere) */}
              <Link
                href={`/tools/${item.slug}`}
                aria-label={`Open details for ${name}`}
                className="absolute inset-0 z-20 block"
              >
                <span className="sr-only">Open details for {name}</span>
              </Link>

              {/* Media region */}
              <div className="relative aspect-video w-full bg-gray-100">
                {videoId ? (
                  // Put iframe ABOVE the overlay so clicks on the player still play the video
                  <div className="absolute inset-0 z-30">
                    <YouTubeEmbed videoId={videoId} title={`${name} — Official video`} />
                  </div>
                ) : (
                  // No video: show poster/logo (overlay above will handle navigation)
                  (() => {
                    const poster = pickLogoUrl(item);
                    return poster ? (
                      <img
                        src={poster}
                        alt={`${name} logo`}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-xs text-gray-500">
                        No preview available
                      </div>
                    );
                  })()
                )}

                {/* Optional “play” affordance when there is a video (visual only) */}
                {videoId && (
                  <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
                    <div className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <div className="grid place-items-center rounded-full bg-black/60 p-3">
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="fill-white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Title row (sits below overlay; overlay still captures clicks here) */}
              <div className="relative z-10 p-3 text-sm font-medium">{name}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
