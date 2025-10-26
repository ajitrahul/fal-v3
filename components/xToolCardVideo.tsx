// components/ToolCardVideo.tsx
// SERVER component (no "use client")

import Link from "next/link";
import { getVideoForTool } from "@/lib/video";

type Tool = (typeof import("@/lib/data").DB)["tools"][number] | any;

export default function ToolCardVideo({ tool }: { tool: Tool }) {
  const video = getVideoForTool(tool); // deterministic

  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm hover:bg-gray-50 transition"
      style={{ contain: "content" }}
    >
      {/* Video (if present) */}
      {video ? (
        <div className="mb-3 overflow-hidden rounded-md border">
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={video.src}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : null}

      {/* Title (always clickable) */}
      <h3 className="text-sm font-semibold leading-snug">
        <Link
          href={`/tools/${tool.slug}`}
          className="inline-block underline decoration-transparent hover:decoration-gray-300"
        >
          {tool.name}
        </Link>
      </h3>

      {/* Optional tagline */}
      {typeof tool?.tagline === "string" && tool.tagline.trim() ? (
        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{tool.tagline}</p>
      ) : null}

      {/* Optional “best suited for …” */}
      {Array.isArray(tool?.best_for) && tool.best_for.length > 0 ? (
        <p className="mt-1 text-[11px] text-gray-600">
          Best suited for <span className="font-medium">{tool.best_for[0]}</span>
        </p>
      ) : null}
    </div>
  );
}
