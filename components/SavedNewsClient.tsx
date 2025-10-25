"use client";

import { useEffect, useMemo, useState } from "react";
import NewsCard from "./NewsCard";

type BookmarkItem = {
  id: string;
  title: string;
  link: string;
  isoDate: string;
  source: string;
  summary?: string;
} | string;

export default function SavedNewsClient() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [enriched, setEnriched] = useState<any[]>([]);

  // Load bookmarks
  useEffect(() => {
    try {
      const raw = localStorage.getItem("newsBookmarks");
      const arr = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(arr) ? arr : []);
    } catch {
      setItems([]);
    }
  }, []);

  // Enrich: fetch latest news and map link->item (for old string-only bookmarks)
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-news?limit=200", { cache: "no-store" });
        const json = await res.json();
        if (abort) return;
        const byLink = new Map<string, any>();
        for (const it of json.items || []) byLink.set(it.link, it);
        const materialized = (items || []).map((b: BookmarkItem) => {
          if (typeof b === "string") return byLink.get(b) || { link: b, title: b, isoDate: "", source: "Saved link" };
          return b;
        });
        setEnriched(materialized);
      } catch {
        const fallback = (items || []).map((b: BookmarkItem) =>
          typeof b === "string" ? { link: b, title: b, isoDate: "", source: "Saved link" } : b
        );
        setEnriched(fallback);
      }
    })();
    return () => {
      abort = true;
    };
  }, [items]);

  const hasAny = useMemo(() => enriched.some((x) => !!x && !!x.link), [enriched]);

  if (!hasAny) {
    return <p className="text-sm text-gray-600 dark:text-zinc-400">No saved items yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {enriched.map((n: any, i: number) =>
        n?.link ? (
          <NewsCard
            key={n.id || n.link || i}
            id={n.id}
            title={n.title || n.link}
            link={n.link}
            isoDate={n.isoDate || ""}
            source={n.source || "Saved link"}
            summary={n.summary}
          />
        ) : null
      )}
    </div>
  );
}
