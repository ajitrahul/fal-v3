// lib/ai-news.ts
import Parser from "rss-parser";
import { getFeeds, type Feed } from "./ai-news-feeds";
import { load as loadHtml } from "cheerio";

export type NewsCategory = "Company" | "Research" | "Community";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  isoDate: string; // ISO 8601
  source: string;  // feed.name
  category: NewsCategory;
  summary?: string;
  imageUrl?: string;
  videoUrl?: string;
};

const parser = new Parser<any>({
  timeout: 15000,
  headers: { "User-Agent": "AIToolsDirectoryBot/1.0 (+news)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["media:group", "mediaGroup", { keepArray: true }],
      ["enclosure", "enclosure"],
      ["content:encoded", "contentEncoded"],
      ["description", "descHtml"],
    ],
  },
});

const UA = "Mozilla/5.0 (compatible; AIToolsDirectoryBot/1.0; +news)";
const PER_SOURCE_MAX = 20;
const MAX_OG_FETCH_PER_FEED = 4; // cap to avoid heavy crawling

/* ---------------- small utils ---------------- */
function toIso(d?: string): string {
  const ts = d ? Date.parse(d) : NaN;
  return Number.isNaN(ts) ? new Date().toISOString() : new Date(ts).toISOString();
}
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `n${(h >>> 0).toString(16)}`;
}
function hostOf(link: string) {
  try {
    return new URL(link).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function absUrl(maybe: string, baseHref: string) {
  if (!maybe) return "";
  try {
    if (maybe.startsWith("http://") || maybe.startsWith("https://")) return maybe;
    const base = new URL(baseHref);
    return new URL(maybe, base.origin).toString();
  } catch {
    return maybe;
  }
}
function fromSrcset(srcset?: string) {
  if (!srcset) return "";
  // take first candidate
  const first = srcset.split(",")[0]?.trim();
  if (!first) return "";
  return first.split(/\s+/)[0] || "";
}
function isYouTube(u: string) {
  try {
    const url = new URL(u);
    return /(^|\.)youtube\.com$/.test(url.hostname) || /(^|\.)youtu\.be$/.test(url.hostname);
  } catch {
    return false;
  }
}
function isVimeo(u: string) {
  try {
    const url = new URL(u);
    return /(^|\.)vimeo\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** Simple classifier (refine later if needed) */
function classify(source: string, link: string): NewsCategory {
  const s = (source || "").toLowerCase();
  const h = hostOf(link);
  if (s.includes("arxiv") || h.includes("arxiv.org")) return "Research";
  if (
    s.includes("google ai") || h.includes("ai.googleblog.com") ||
    s.includes("microsoft ai") || h.includes("blogs.microsoft.com") ||
    s.includes("openai") || s.includes("anthropic") ||
    h.includes("openai.com") || h.includes("anthropic.com") ||
    h.includes("developer.nvidia.com") || s.includes("nvidia")
  ) return "Company";
  return "Community";
}

function googleNewsTopicToRss(url: string) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/topics\/([^/]+)/);
    const id = m?.[1];
    if (!id) return null;
    const hl = (u.searchParams.get("hl") ?? "en-US");
    const gl = (u.searchParams.get("gl") ?? "US");
    const ceid = `${gl}:${(hl.split("-")[1] || "en")}`;
    return `https://news.google.com/rss/topics/${id}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  } catch {
    return null;
  }
}

/* ---------------- RSS media helpers ---------------- */
function pickRssImage(it: any, baseLink: string): string | undefined {
  // enclosure with image
  const enc = it?.enclosure;
  if (enc?.url && typeof enc.url === "string" && String(enc.type || "").startsWith("image/")) {
    return enc.url;
  }
  // media:content
  const mc = it?.mediaContent;
  if (Array.isArray(mc)) {
    for (const m of mc) {
      const url = m?.$?.url || m?.url;
      const typ = m?.$?.type || m?.type || "";
      if (url && String(typ).startsWith("image/")) return url;
    }
  } else if (mc && (mc.$?.url || mc.url) && String(mc.$?.type || mc.type || "").startsWith("image/")) {
    return mc.$?.url || mc.url;
  }
  // media:thumbnail
  const mt = it?.mediaThumbnail;
  if (Array.isArray(mt)) {
    const url = mt[0]?.$?.url || mt[0]?.url;
    if (url) return url;
  } else if (mt && (mt.$?.url || mt.url)) {
    return mt.$?.url || mt.url;
  }
  // content:encoded or description HTML
  const html = it?.contentEncoded || it?.content || it?.descHtml || "";
  if (typeof html === "string" && html.includes("<img")) {
    try {
      const $ = loadHtml(html);
      const img = $("img").first();
      const src =
        img.attr("src") ||
        img.attr("data-src") ||
        img.attr("data-lazy-src") ||
        img.attr("data-original") ||
        fromSrcset(img.attr("srcset")) ||
        fromSrcset(img.attr("data-srcset")) ||
        "";
      if (src) return absUrl(src, baseLink);
    } catch {}
  }
  return undefined;
}
function pickRssVideo(it: any): string | undefined {
  const enc = it?.enclosure;
  if (enc?.url && typeof enc.url === "string" && String(enc.type || "").startsWith("video/")) {
    return enc.url;
  }
  const mc = it?.mediaContent;
  if (Array.isArray(mc)) {
    for (const m of mc) {
      const url = m?.$?.url || m?.url;
      const typ = m?.$?.type || m?.type || "";
      if (url && String(typ).startsWith("video/")) return url;
    }
  } else if (mc && (mc.$?.url || mc.url) && String(mc.$?.type || mc.type || "").startsWith("video/")) {
    return mc.$?.url || mc.url;
  }
  return undefined;
}

/* ---------------- OG image fallback ---------------- */
async function fetchOgImage(link: string): Promise<string | undefined> {
  try {
    const r = await fetch(link, { headers: { "User-Agent": UA } });
    if (!r.ok) return undefined;
    const html = await r.text();
    const $ = loadHtml(html);
    const og =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="twitter:image"]').attr("content") ||
      "";
    if (og) return absUrl(og, link);
  } catch {}
  return undefined;
}

/* ---------------- RSS fetch ---------------- */
async function fetchRss(feed: Feed) {
  const out: NewsItem[] = [];
  const rssUrl = feed.kind === "google-news-topic" ? googleNewsTopicToRss(feed.url) : feed.url;
  if (!rssUrl) return out;

  let ogFetchBudget = MAX_OG_FETCH_PER_FEED;

  const res = await parser.parseURL(rssUrl);
  const items = (res.items || []).slice(0, PER_SOURCE_MAX);
  for (const it of items) {
    const title = (it.title || "").trim();
    const link = (it.link || "").trim();
    if (!title || !link) continue;

    const iso = toIso((it.isoDate as string) || (it.pubDate as string));
    let imageUrl = pickRssImage(it, link);
    let videoUrl = pickRssVideo(it);

    // Heuristic: mark video for YouTube/Vimeo links
    if (!videoUrl && (isYouTube(link) || isVimeo(link))) {
      videoUrl = link;
    }

    // OG fallback (bounded)
    if (!imageUrl && ogFetchBudget > 0) {
      ogFetchBudget -= 1;
      imageUrl = await fetchOgImage(link);
    }

    out.push({
      id: hash(link),
      title,
      link,
      isoDate: iso,
      source: feed.name,
      category: classify(feed.name, link),
      summary: it.contentSnippet || it.summary || undefined,
      imageUrl,
      videoUrl,
    });
  }
  return out;
}

/* ---------------- HTML fetch ---------------- */
async function fetchHtml(feed: Feed) {
  const out: NewsItem[] = [];
  const r = await fetch(feed.url, { headers: { "User-Agent": UA } });
  if (!r.ok) return out;

  const html = await r.text();
  const $ = loadHtml(html);

  const cfg = feed.selector || {};
  const itemSel = cfg.item || "article, .post, .card, li a[href]";
  const linkSel = cfg.link || "a[href]";
  const titleSel = cfg.title || "h2, h3, a[href]";
  const timeSel = cfg.time || "time";
  const timeAttr = cfg.timeAttr || "datetime";

  const items = $(itemSel).slice(0, PER_SOURCE_MAX);
  items.each((_, el) => {
    const wrap = $(el);

    // link
    let link = "";
    if (linkSel === ":scope") link = wrap.attr("href") || "";
    else link = wrap.find(linkSel).attr("href") || "";
    link = absUrl(link, feed.url);
    if (!link) return;

    // title
    let title = "";
    if (titleSel === ":scope") title = (wrap.text() || "").trim();
    else title = (wrap.find(titleSel).first().text() || "").trim();

    // fallback title from any anchor with long text
    if (!title) {
      const a = wrap.find("a[href]").filter((_, ael) => ($(ael).text().trim().length > 20)).first();
      if (a.length) title = a.text().trim();
    }
    if (!title) return;

    // time
    let iso = "";
    const t = wrap.find(timeSel).first();
    if (t.length) {
      const raw = (timeAttr ? t.attr(timeAttr) : t.text()) || "";
      iso = raw ? toIso(raw) : "";
    }
    if (!iso) iso = new Date().toISOString();

    // media
    let imageUrl: string | undefined;

    // (1) <img> directly
    let img = wrap.find("img").first();
    if (img.length === 0) {
      // also check inside <picture>
      img = wrap.find("picture img").first();
    }
    if (img.length) {
      const src =
        img.attr("src") ||
        img.attr("data-src") ||
        img.attr("data-lazy-src") ||
        img.attr("data-original") ||
        fromSrcset(img.attr("srcset")) ||
        fromSrcset(img.attr("data-srcset")) ||
        "";
      if (src) imageUrl = absUrl(src, feed.url);
    } else {
      // (2) <source srcset> inside <picture>
      const source = wrap.find("picture source[srcset]").first();
      const ss = source.attr("srcset");
      if (ss) {
        const first = fromSrcset(ss);
        if (first) imageUrl = absUrl(first, feed.url);
      }
    }

    // (3) OG fallback in list view (lightweight fetch would be too heavy per item here).
    // We'll skip here to keep HTML list fast; OG fallback is used in RSS path above.

    const videoUrl = isYouTube(link) || isVimeo(link) ? link : undefined;

    out.push({
      id: hash(link),
      title,
      link,
      isoDate: iso,
      source: feed.name,
      category: classify(feed.name, link),
      imageUrl,
      videoUrl,
    });
  });

  // Fallback naive scan if nothing matched
  if (out.length === 0) {
    $("main a[href], article a[href], .post a[href]").each((_, a) => {
      if (out.length >= PER_SOURCE_MAX) return false;
      const $a = $(a);
      const text = $a.text().trim();
      let link = $a.attr("href") || "";
      if (!link || text.length < 20) return;
      link = absUrl(link, feed.url);
      out.push({
        id: hash(link),
        title: text,
        link,
        isoDate: new Date().toISOString(),
        source: feed.name,
        category: classify(feed.name, link),
      });
    });
  }

  return out.slice(0, PER_SOURCE_MAX);
}

/* ---------------- Public API ---------------- */
export type FetchNewsInput = {
  q?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  limit?: number;
};

export async function fetchNews(input: FetchNewsInput = {}): Promise<NewsItem[]> {
  const { q = "", from, to, limit = 120 } = input;
  const qn = q.trim().toLowerCase();
  const fromTs = from ? Date.parse(from) : NaN;
  const toTs = to ? Date.parse(to) : NaN;

  const feeds = getFeeds().filter((f) => f.enabled !== false);
  const results: NewsItem[] = [];

  await Promise.all(
    feeds.map(async (f) => {
      try {
        const items =
          f.kind === "rss" || f.kind === "google-news-topic"
            ? await fetchRss(f)
            : await fetchHtml(f);

        for (const it of items) {
          const ts = Date.parse(it.isoDate);
          if (!Number.isNaN(fromTs) && ts < fromTs) continue;
          if (!Number.isNaN(toTs) && ts > toTs) continue;

          if (qn) {
            const hay = [it.title.toLowerCase(), it.summary?.toLowerCase() || ""].join(" ");
            if (!hay.includes(qn)) continue;
          }
          results.push(it);
        }
      } catch {
        // ignore feed failures
      }
    })
  );

  // Dedupe by link
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const x of results) {
    if (seen.has(x.link)) continue;
    seen.add(x.link);
    deduped.push(x);
  }

  // newest first
  deduped.sort((a, b) => Date.parse(b.isoDate) - Date.parse(a.isoDate));
  return deduped.slice(0, Math.max(1, Math.min(limit, 300)));
}
