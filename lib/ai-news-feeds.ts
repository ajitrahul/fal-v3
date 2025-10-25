// lib/ai-news-feeds.ts
// Vendor-only AI news focused on AI Tools / LLM / AI Models, plus general AI Updates.
// No external deps. Safe to import from Server Components & Route Handlers.

export type FetchInput = {
  q?: string;
  from?: string; // ISO (inclusive)
  to?: string;   // ISO (inclusive)
  limit?: number; // cap after merge
};

export type NewsItem = {
  title: string;
  url: string;
  date?: string; // ISO
  source: string;   // human label
  sourceId: string; // internal key
  categories?: string[];
  media?: { url: string; type: "image" | "video" }; // NEW
};

type Source = {
  id: string;
  name: string;
  homepage: string;
  mode: "feed" | "html";
  feed?: string;
  html?: {
    listSelector: RegExp;
    linkSelector: RegExp;
    titleSelector: RegExp;
    dateSelector?: RegExp;
  };
  max?: number;
};

export type NewsCategory = "tools" | "llm" | "models" | "updates";

/* ---------------- Sources (official vendor blogs) ---------------- */
const SOURCES: Source[] = [
  { id: "openai", name: "OpenAI News", homepage: "https://openai.com/news/", mode: "feed", feed: "https://openai.com/news/rss.xml", max: 20 },
  { id: "anthropic", name: "Anthropic", homepage: "https://www.anthropic.com/news", mode: "html",
    html: {
      listSelector: /<a[^>]+href="\/news\/[^"]+"[\s\S]*?<\/a>/g,
      linkSelector: /href="(\/news\/[^"]+)"/,
      titleSelector: />([^<]{8,200})<\/a>/,
    }, max: 20
  },
  { id: "deepmind", name: "Google DeepMind (Blog.Google)", homepage: "https://blog.google/", mode: "feed",
    feed: "https://blog.google/rss/?category=Google%20DeepMind", max: 20 },
  { id: "microsoft-ai", name: "Microsoft (Official Blog – AI)", homepage: "https://blogs.microsoft.com/", mode: "feed",
    feed: "https://blogs.microsoft.com/blog/tag/ai/feed/", max: 20 },
  { id: "nvidia", name: "NVIDIA Blog", homepage: "https://blogs.nvidia.com/", mode: "feed",
    feed: "https://blogs.nvidia.com/feed/", max: 20 },
  { id: "meta-eng", name: "Engineering at Meta", homepage: "https://engineering.fb.com/", mode: "feed",
    feed: "https://engineering.fb.com/feed/", max: 20 },
  { id: "ibm-research", name: "IBM Research Blog", homepage: "https://research.ibm.com/blog", mode: "html",
    html: {
      listSelector: /<a[^>]+href="\/blog\/[^"]+"[\s\S]*?<\/a>/g,
      linkSelector: /href="(\/blog\/[^"]+)"/,
      titleSelector: />([^<]{8,200})<\/a>/,
    }, max: 20
  },
  { id: "aws-ml", name: "AWS Machine Learning Blog", homepage: "https://aws.amazon.com/blogs/machine-learning/", mode: "feed",
    feed: "https://aws.amazon.com/blogs/machine-learning/feed/", max: 20 },
  { id: "salesforce-eng", name: "Salesforce Engineering", homepage: "https://engineering.salesforce.com/", mode: "html",
    html: {
      listSelector: /<a[^>]+href="https:\/\/engineering\.salesforce\.com\/[^"]+"[\s\S]*?<\/a>/g,
      linkSelector: /href="(https:\/\/engineering\.salesforce\.com\/[^"]+)"/,
      titleSelector: />([^<]{8,200})<\/a>/,
    }, max: 20
  },
  { id: "hugging-face", name: "Hugging Face Blog", homepage: "https://huggingface.co/blog", mode: "feed",
    feed: "https://huggingface.co/blog/feed.xml", max: 20 },
];

/* ---------------- Helpers ---------------- */
const REVALIDATE_SEC = Number(process.env.NEWS_FEEDS_REVALIDATE || 900); // ~15 min

function stripCdata(s: string) {
  // Remove <![CDATA[...]]> markers if present
  return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
}
function safeISO(d?: string | number | Date) {
  try { if (!d) return undefined; const dt = new Date(d); return isNaN(dt.getTime()) ? undefined : dt.toISOString(); }
  catch { return undefined; }
}
function decodeHtml(s: string) {
  const noCdata = stripCdata(s);
  return noCdata
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function absolutize(base: string, href: string) {
  if (/^https?:\/\//i.test(href)) return href;
  try { return new URL(href, base).toString(); } catch { return href; }
}
async function fetchText(url: string) {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SEC } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res.text();
}

// RSS/Atom parsing
function extractBlocks(xml: string): string[] {
  const items = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map(m => m[0]);
  return items.length ? items : Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map(m => m[0]);
}
function pickTag(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeHtml(m[1].trim()) : undefined;
}
function pickLink(block: string) {
  // RSS: <link>https://…</link>
  const rss = pickTag(block, "link");
  if (rss && /^https?:\/\//i.test(rss)) return rss;
  // Atom: <link rel="alternate" href="https://…"/>
  const atom = block.match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || block.match(/<link\b[^>]*href="([^"]+)"/i);
  return atom ? atom[1] : undefined;
}
function pickDate(block: string) {
  return pickTag(block, "pubDate") || pickTag(block, "updated") || pickTag(block, "published") || undefined;
}
// NEW: extract media from common RSS tags
function pickMedia(block: string): { url: string; type: "image" | "video" } | undefined {
  // enclosure
  const enc = block.match(/<enclosure\b[^>]*url="([^"]+)"[^>]*type="([^"]+)"/i);
  if (enc) {
    const url = enc[1];
    const typeAttr = (enc[2] || "").toLowerCase();
    if (typeAttr.startsWith("image/")) return { url, type: "image" };
    if (typeAttr.startsWith("video/")) return { url, type: "video" };
  }
  // media:content
  const mc = block.match(/<media:content\b[^>]*url="([^"]+)"([^>]*)\/?>/i);
  if (mc) {
    const url = mc[1];
    const attrs = mc[2] || "";
    const hasImg = /medium="image"/i.test(attrs) || /type="image\//i.test(attrs);
    const hasVid = /medium="video"/i.test(attrs) || /type="video\//i.test(attrs);
    if (hasImg) return { url, type: "image" };
    if (hasVid) return { url, type: "video" };
  }
  // media:thumbnail
  const mt = block.match(/<media:thumbnail\b[^>]*url="([^"]+)"/i);
  if (mt) {
    return { url: mt[1], type: "image" };
  }
  return undefined;
}
function pickCategories(block: string): string[] | undefined {
  const cats = Array.from(block.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)).map(m => decodeHtml(m[1].trim()).slice(0,80));
  const atom = Array.from(block.matchAll(/<category\b[^>]*term="([^"]+)"/gi)).map(m => m[1].trim());
  const all = [...cats, ...atom].filter(Boolean);
  return all.length ? Array.from(new Set(all)) : undefined;
}

/* ---------------- Topic logic: categorize items ---------------- */
const TOOL_TERMS = [
  "api","sdk","tool","tools","plugin","integration","framework","library","package","cli",
  "studio","console","dashboard","ui","workspace","playground",
  "endpoint","realtime","function calling","tool use","agents","agent",
  "rag","retrieval","embedding","vector","vector db","faiss","pgvector","pinecone","weaviate","milvus","chroma","lancedb",
  "observability","evals","benchmark","leaderboard","guardrails",
  "langchain","llamaindex","tgi","triton","tensorrt","nemo","nim","bedrock","sagemaker","vertex ai","azure openai","fabric",
];
const LLM_TERMS = [
  "llm","large language model","language model","chat model","chatgpt","gpt","gpt-4","gpt-4o","o1","o3",
  "claude","sonnet","opus","haiku",
  "gemini","gemma",
  "llama","llama 3","llama3","mistral","mixtral","phi","deepseek","qwen","yi","grok","reka","jurassic","jamba",
];
const MODEL_TERMS = [
  "model","checkpoint","weights","parameters","multimodal","vision","image","video","audio","speech","tts","asr",
  "diffusion","stable diffusion","sdxl","imagen","kosmos","whisper","musicgen","seamlessm4t","v-jepa",
  "quantization","gguf","awq","gptq","moe","mixture of experts","fine-tune","finetune","sft","dpo","rlhf",
];
const GENERIC_NEG = [
  "policy","regulation","ban","lawsuit","court","copyright","ethics",
  "stock","shares","ipo","earnings","market cap","valuation",
  "autonomous vehicle","self-driving","robot","robotics","drone","drones",
  "metaverse","vr","ar","headset","crypto","bitcoin","blockchain","nft",
];

// Per-source boosts
const BOOST: Record<string, Partial<Record<NewsCategory, string[]>>> = {
  openai: { llm: ["gpt","o1","o3","chatgpt"], tools: ["assistants","structured output","realtime","api","function calling"], models: ["whisper","sora"] },
  anthropic: { llm: ["claude","sonnet","opus","haiku"], tools: ["artifacts","api","tool use"] },
  deepmind: { llm: ["gemini"], models: ["vision","multimodal","video"], tools: ["benchmark","agents"] },
  "microsoft-ai": { llm: ["phi","copilot"], tools: ["azure openai","prompt flow","autogen","fabric","ml"] },
  nvidia: { tools: ["tensorrt","triton","nemo","nim","ngc","cuda-x ai","riva","maxine"], models: ["model","inference"] },
  "meta-eng": { llm: ["llama"], models: ["segment anything","vision","multimodal"] },
  "ibm-research": { models: ["granite","watsonx"], tools: ["instructlab","fm inference"] },
  "aws-ml": { tools: ["bedrock","sagemaker","guardrails","agents for bedrock"], models: ["titan","model"] },
  "salesforce-eng": { tools: ["einstein","agentforce"], llm: ["xgen","codegen"] },
  "hugging-face": { tools: ["transformers","diffusers","datasets","text-generation-inference","safetensors"], models: ["model","checkpoint"] },
};

function countHits(hay: string, terms: string[]) {
  const lc = hay.toLowerCase();
  let n = 0;
  for (const t of terms) if (lc.includes(t)) n++;
  return n;
}
function boostHits(id: string, hay: string, cat: NewsCategory) {
  const ts = BOOST[id]?.[cat] || [];
  return countHits(hay, ts);
}
function pathHint(url: string) {
  return /(\/ai\/|\/ml\/|machine-?learning|\/model|\/llm|\/genai|\/generative-ai)/i.test(url);
}

export function categorizeNews(items: NewsItem[]): Array<NewsItem & { category: NewsCategory }> {
  const out: Array<NewsItem & { category: NewsCategory }> = [];
  for (const it of items) {
    const hay = `${it.title || ""} ${(it.categories || []).join(" ")} ${it.source}`.toLowerCase();
    const neg = countHits(hay, GENERIC_NEG);

    // base scores
    let sTools  = countHits(hay, TOOL_TERMS)  + boostHits(it.sourceId, hay, "tools")  + (pathHint(it.url) ? 1 : 0);
    let sLLM    = countHits(hay, LLM_TERMS)   + boostHits(it.sourceId, hay, "llm");
    let sModels = countHits(hay, MODEL_TERMS) + boostHits(it.sourceId, hay, "models");

    // If negative context (policy/finance/etc), require stronger positives
    if (neg > 0) {
      sTools  = Math.max(0, sTools  - 1);
      sLLM    = Math.max(0, sLLM    - 1);
      sModels = Math.max(0, sModels - 1);
    }

    // Choose by strongest bucket (ties resolved deterministically)
    let cat: NewsCategory = "updates";
    if (sLLM >= sModels && sLLM >= sTools && sLLM > 0) cat = "llm";
    else if (sModels >= sTools && sModels > 0)          cat = "models";
    else if (sTools > 0)                                 cat = "tools";
    else                                                 cat = "updates";

    out.push({ ...it, category: cat });
  }
  return out;
}

/* ---------------- Per-source fetch ---------------- */
async function fetchFromSource(s: Source): Promise<NewsItem[]> {
  const cap = s.max ?? 20;

  if (s.mode === "feed" && s.feed) {
    const xml = await fetchText(s.feed);
    const blocks = extractBlocks(xml).slice(0, cap);
    return blocks.map((b) => {
      const title = pickTag(b, "title") || "(untitled)";
      const link = pickLink(b) || s.homepage;
      const d = pickDate(b);
      const media = pickMedia(b); // NEW
      return {
        title,
        url: absolutize(s.homepage, link),
        date: safeISO(d),
        source: s.name,
        sourceId: s.id,
        categories: pickCategories(b),
        media, // NEW
      };
    }).filter(i => i.title && i.url);
  }

  if (s.mode === "html" && s.html) {
    try {
      const html = await fetchText(s.homepage);
      const matches = html.match(s.html.listSelector) || [];
      return matches.slice(0, cap).map((block) => {
        const href = (block.match(s.html.linkSelector)?.[1] || "").trim();
        const rawTitle = (block.match(s.html.titleSelector)?.[1] || "").trim();
        const title = decodeHtml(rawTitle);
        return {
          title,
          url: absolutize(s.homepage, href),
          date: undefined,
          source: s.name,
          sourceId: s.id,
        };
      }).filter(i => i.title && i.url);
    } catch {
      return [];
    }
  }

  return [];
}

/* ---------------- Public API ---------------- */
export async function fetchNews(input: FetchInput = {}) {
  const { q, from, to, limit } = input;
  const qLC = (q || "").trim().toLowerCase();
  const fromT = from ? Date.parse(from) : undefined;
  const toT = to ? Date.parse(to) : undefined;

  const results = await Promise.allSettled(SOURCES.map(fetchFromSource));
  let items = results.flatMap(r => (r.status === "fulfilled" ? r.value : []));

  // de-dupe by URL
  const seen = new Set<string>();
  items = items.filter(i => {
    const key = (i.url || "").split("#")[0];
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // optional query
  if (qLC) {
    items = items.filter(i => {
      const hay = `${i.title} ${i.source} ${(i.categories || []).join(" ")}`.toLowerCase();
      return hay.includes(qLC);
    });
  }

  // date window (drop undated if a window is applied)
  if (fromT || toT) {
    items = items.filter(i => {
      const t = i.date ? Date.parse(i.date) : NaN;
      if (isNaN(t)) return false;
      if (fromT && t < fromT) return false;
      if (toT && t > toT) return false;
      return true;
    });
  }

  // sort by recency (undated sink)
  items.sort((a, b) => (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0));

  const cap = Number.isFinite(limit) && limit! > 0 ? Number(limit) : 200;
  return items.slice(0, cap);
}

// For your page dropdown / sources listing
export function getNewsSources() {
  // include homepage so /ai-news/sources can link out
  return SOURCES.map(({ id, name, homepage }) => ({ id, name, homepage }));
}

// Your RSS route calls getFeeds — alias fetchNews
export async function getFeeds(input: FetchInput = {}) {
  return fetchNews(input);
}

export default fetchNews;
