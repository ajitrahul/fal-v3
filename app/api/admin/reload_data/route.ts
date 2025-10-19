// app/api/admin/reload-data/route.ts
// Admin endpoint to force-reload the in-memory DB cache on demand.
// Optional protection via ADMIN_RELOAD_TOKEN (query ?token=... or header x-reload-token).
// In dev (NODE_ENV !== 'production') and no token set, it allows access.

import { NextResponse } from "next/server";
import { __resetDBCache__, getDB } from "@/lib/data";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const token = process.env.ADMIN_RELOAD_TOKEN || "";
  const q = url.searchParams.get("token") || "";
  const h = req.headers.get("x-reload-token") || "";

  if (!token) {
    // No token configured -> allow in non-production to ease local dev
    return process.env.NODE_ENV !== "production";
  }
  return q === token || h === token;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Reset + rebuild to report fresh counts
  __resetDBCache__();
  const db = getDB();

  return NextResponse.json({
    ok: true,
    tools: db.tools.length,
    categories: db.categories.length,
    note:
      "Cache cleared and rebuilt. If you added new files under data/tools/, the site now sees them.",
  });
}

export async function POST(req: Request) {
  return GET(req);
}
