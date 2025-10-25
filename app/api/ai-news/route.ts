// app/api/ai-news/route.ts
export const runtime = "nodejs";
export const revalidate = 600; // cache for 10 minutes

import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/ai-news";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const limit = Number(url.searchParams.get("limit") || "60");
  const items = await fetchNews({ q, from, to, limit: Number.isFinite(limit) ? limit : 60 });
  return NextResponse.json({ ok: true, count: items.length, items });
}
