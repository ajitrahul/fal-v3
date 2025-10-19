// components/TutorialSearchEmbed.tsx
"use client";

import { useEffect, useState } from "react";

type Video = {
  id: string;
  title?: string;
  description?: string;
  channelTitle?: string;
  publishedAt?: string;
};

async function fetchVideos(q: string, max = 3): Promise<Video[]> {
  const res = await fetch(`/api/yt-search?q=${encodeURIComponent(q)}&max=${max}`);
  const json = await res.json();
  if (!json.ok) return [];
  return json.videos as Video[];
}

export default function TutorialSearchEmbed({
  queries,
  maxPerQuery = 3,
  title = "From YouTube search",
}: {
  queries: string[];
  maxPerQuery?: number;
  title?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<{ q: string; videos: Video[] }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const out: { q: string; videos: Video[] }[] = [];
      for (const q of queries) {
        const vids = await fetchVideos(q, maxPerQuery);
        if (cancelled) return;
        out.push({ q, videos: vids });
      }
      setGroups(out);
      setLoading(false);
    }
    if (queries.length) run();
    else {
      setGroups([]);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [queries, maxPerQuery]);

  if (!queries.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-700">{title}</h3>
      {loading ? (
        <div className="text-sm text-zinc-500">Loading videos…</div>
      ) : (
        groups.map((g) => (
          <div key={g.q} className="space-y-2">
            <div className="text-xs text-zinc-500">Query: {g.q}</div>
            {g.videos.length === 0 ? (
              <div className="text-sm text-zinc-500">No videos found.</div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {g.videos.map((v) => (
                  <li key={v.id} className="rounded-md border overflow-hidden">
                    <div className="aspect-video bg-black">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${v.id}`}
                        title={v.title || "YouTube video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                    <div className="p-3 border-t">
                      <div className="text-sm font-medium line-clamp-2">{v.title}</div>
                      {v.channelTitle && (
                        <div className="text-xs text-zinc-500 mt-0.5">{v.channelTitle}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}
