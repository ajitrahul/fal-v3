// app/api/yt-search/route.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs"; // ensure Node runtime (needed for fs)

const API_KEY = process.env.YOUTUBE_API_KEY;
const TTL_HOURS = Number(process.env.YT_CACHE_TTL_HOURS || 24); // default 24h

// Simple project-local cache folder: .cache/yt
const CACHE_DIR = path.join(process.cwd(), ".cache", "yt");

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

function cacheKey(q: string, max: number) {
  const h = crypto.createHash("sha256").update(`${q}::${max}`).digest("hex").slice(0, 32);
  return path.join(CACHE_DIR, `${h}.json`);
}

async function readCache(filePath: string) {
  try {
    const buf = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(buf) as { savedAt: number; data: unknown };
    if (!json?.savedAt) return null;

    const ageMs = Date.now() - json.savedAt;
    const ttlMs = TTL_HOURS * 60 * 60 * 1000;
    if (ageMs > ttlMs) return null; // stale

    return json.data;
  } catch {
    return null;
  }
}

async function writeCache(filePath: string, data: unknown) {
  try {
    const payload = JSON.stringify({ savedAt: Date.now(), data });
    await fs.writeFile(filePath, payload, "utf8");
  } catch {
    /* ignore cache write failures */
  }
}

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing YOUTUBE_API_KEY in environment." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const max = Math.max(1, Math.min(parseInt(searchParams.get("max") || "3", 10) || 3, 6));

  if (!q) {
    return NextResponse.json({ ok: false, error: "Missing q" }, { status: 400 });
  }

  // Try cache first
  await ensureCacheDir();
  const keyPath = cacheKey(q, max);
  const cached = await readCache(keyPath);
  if (cached) {
    return NextResponse.json({ ok: true, videos: cached });
  }

  // Fetch YouTube Data API
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("q", q);
  url.searchParams.set("key", API_KEY);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { ok: false, error: `YouTube API error: ${txt}` },
        { status: res.status }
      );
    }
    const json = await res.json();
    const items = Array.isArray(json.items) ? json.items : [];
    const videos = items
      .map((it: any) => ({
        id: it?.id?.videoId,
        title: it?.snippet?.title,
        description: it?.snippet?.description,
        channelTitle: it?.snippet?.channelTitle,
        publishedAt: it?.snippet?.publishedAt,
      }))
      .filter((v: any) => v.id);

    // Save to cache (best-effort)
    await writeCache(keyPath, videos);

    return NextResponse.json({ ok: true, videos });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to query YouTube" },
      { status: 500 }
    );
  }
}
