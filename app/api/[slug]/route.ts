// app/api/slugs/route.ts
import { NextResponse } from "next/server";
import { DB } from "@/lib/data";

// Keep Node runtime (we read local JSON/TS data)
export const runtime = "nodejs";

// Cache at the edge/CDN for 1 hour, allow stale for 1 day
export const revalidate = 3600; // ISR-style hint
export const dynamic = "force-static";

export async function GET() {
  const items = DB.tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline || t.summary || null,
  }));

  const res = NextResponse.json({ ok: true, items });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  return res;
}
