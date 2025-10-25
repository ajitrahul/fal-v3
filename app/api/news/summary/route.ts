// app/api/news/summary/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const cache = new Map<string, { text: string; at: number }>();

function ok(data: any, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}
function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
function server(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AINewsSummarizer/1.0; +https://example.com)",
        accept: "text/html,application/xhtml+xml",
      },
      // Don’t cache at fetch layer; our own cache handles it.
      cache: "no-store",
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") || "";
    const raw = await res.text();

    if (ct.includes("html")) {
      // strip script/style and tags
      const noScript = raw
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "");
      const stripped = noScript.replace(/<[^>]+>/g, " ");
      return stripped.replace(/\s+/g, " ").trim().slice(0, 7000);
    }
    return raw.slice(0, 7000);
  } catch {
    return "";
  }
}

async function summarize(url: string, title?: string) {
  // Cache hit?
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { text: hit.text, cached: true };
  }

  // API key (reuse your Gemini key if already set)
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { text: null, cached: false, error: "MISSING_API_KEY" };

  const bodyText = await fetchPageText(url);

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.NEWS_SUMMARY_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = [
    "You are an assistant that writes concise, neutral news summaries.",
    "Output: one paragraph, 1–2 sentences, <= 280 characters, no emojis or bullets, avoid hype.",
    "Focus on what changed/was announced; include numbers or dates if crucial.",
    title ? `Title: ${title}` : "",
    `URL: ${url}`,
    bodyText ? `Page text (truncated): ${bodyText.slice(0, 4000)}` : "No body text fetched.",
  ].join("\n");

  try {
    const r = await model.generateContent(prompt);
    const out = (r.response?.text?.() ?? "").trim();
    const summary = out.slice(0, 400).replace(/\s+/g, " ");
    if (summary) {
      cache.set(url, { text: summary, at: Date.now() });
      return { text: summary, cached: false };
    }
    return { text: null, cached: false, error: "EMPTY" };
  } catch (err: any) {
    return { text: null, cached: false, error: String(err?.message || err) };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const title = searchParams.get("title") || undefined;
  if (!url) return bad("Missing ?url=");
  const result = await summarize(url, title);
  return ok({ url, ...result });
}

export async function POST(req: Request) {
  try {
    const { url, title } = await req.json();
    if (!url) return bad("Missing url");
    const result = await summarize(url, title);
    return ok({ url, ...result });
  } catch {
    return server("Invalid JSON body");
  }
}
