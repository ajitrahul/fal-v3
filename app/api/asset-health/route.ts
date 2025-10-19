import { NextResponse } from "next/server";
import { DB } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Counts basic URL presence (not reaches over network; the Action does that).
 * Useful to see if tutorials/logos/screens exist per tool quickly.
 */
export async function GET() {
  try {
    const tools = DB.tools ?? [];
    const summary = {
      tools: tools.length,
      logos_present: tools.filter(t => typeof t.logo_url === "string" && t.logo_url.trim()).length,
      gallery_present: tools.filter(t => Array.isArray(t.gallery) && t.gallery[0]?.src).length,
      tutorials_present: tools.filter(t => Array.isArray(t.tutorials) && t.tutorials.length > 0).length,
      tutorials_watch_urls: tools.filter(t =>
        (t.tutorials || []).some((v: any) => typeof v.url === "string" && /youtube\.com\/watch\?v=|youtu\.be\//i.test(v.url))
      ).length
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
