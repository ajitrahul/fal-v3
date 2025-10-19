// app/go/[slug]/route.ts
import { NextResponse } from "next/server";
import { DB } from "@/lib/data";
import { resolveOutboundUrl } from "@/lib/affiliates";
import { logOutbound } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  const tool = DB.tools.find((t) => t.slug === slug);

  if (!tool) {
    return new NextResponse("Tool not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const u = new URL(req.url);
  const ctx = u.searchParams.get("ctx") || undefined; // e.g., card, tool_header, category_list
  const finalUrl = resolveOutboundUrl(tool, "go_redirect", ctx);

  // Best-effort log (non-blocking)
  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0] ||
    req.headers.get("cf-connecting-ip") ||
    null;
  const ua = req.headers.get("user-agent");
  const ref = req.headers.get("referer");

  logOutbound({
    t: new Date().toISOString(),
    slug,
    to: finalUrl,
    ip,
    ua,
    ref,
    ctx: ctx || "go",
  });

  const res = NextResponse.redirect(finalUrl, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
