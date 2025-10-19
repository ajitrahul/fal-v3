// app/api/compare/route.ts
// Non-AI comparison API (fallback & default table data)

import { NextResponse } from "next/server";
import { compareBySlugs } from "@/lib/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function parseSlugsParam(s: string | null) {
  if (!s) return [];
  return Array.from(new Set(s.split(/[,\|]/g).map((x) => x.trim()).filter(Boolean))).slice(0, 3);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slugs = parseSlugsParam(searchParams.get("slugs"));
  if (!slugs.length) return bad(400, "Provide ?slugs=a,b[,c]");

  const cmp = compareBySlugs(slugs);
  if (!cmp.raw.length) return bad(404, "No tools matched the provided slugs");

  return NextResponse.json({ ok: true, slugs: cmp.slugs, names: cmp.names, fields: cmp.fields });
}

export async function POST(req: Request) {
  let slugs: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.slugs)) slugs = body.slugs.map((s: any) => String(s));
    else if (typeof body?.slugs === "string") slugs = parseSlugsParam(body.slugs);
  } catch {
    // ignore
  }
  if (!slugs.length) return bad(400, "POST body: { slugs: string[] | string }");

  const cmp = compareBySlugs(slugs);
  if (!cmp.raw.length) return bad(404, "No tools matched the provided slugs");

  return NextResponse.json({ ok: true, slugs: cmp.slugs, names: cmp.names, fields: cmp.fields });
}
