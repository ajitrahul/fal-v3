// app/sitemaps/tools.xml/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

async function listSlugs(): Promise<string[]> {
  const dir = path.join(process.cwd(), "data", "tools");
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/i, ""));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`;

  const slugs = await listSlugs();
  const items = slugs
    .map(
      (s) =>
        `  <url><loc>${base}/tools/${encodeURIComponent(
          s
        )}</loc><changefreq>weekly</changefreq></url>`
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
