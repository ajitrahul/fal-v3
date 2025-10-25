// app/ai-news/rss.xml/route.ts
import { getFeeds } from "@/lib/ai-news-feeds";

function rfc822(iso?: string) {
  if (!iso) return new Date().toUTCString();
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const limit = Number(url.searchParams.get("limit") || "60");

  const items = await getFeeds({ q, from, to, limit });
  const site = `${url.origin}/ai-news`;
  const now = new Date().toUTCString();

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel>` +
    `<title>AI Tools / LLM / Models — Vendor News</title>` +
    `<link>${site}</link>` +
    `<description>Latest vendor news focused on AI tools, LLMs and AI models.</description>` +
    `<language>en</language>` +
    `<lastBuildDate>${now}</lastBuildDate>` +
    items
      .map(
        (it) =>
          `<item>` +
          `<title><![CDATA[${it.title}]]></title>` +
          `<link>${it.url}</link>` +
          `<guid isPermaLink="true">${it.url}</guid>` +
          `<pubDate>${rfc822(it.date)}</pubDate>` +
          `<category>${it.source}</category>` +
          `</item>`
      )
      .join("") +
    `</channel></rss>`;

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
