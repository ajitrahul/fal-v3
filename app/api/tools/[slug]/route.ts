// app/api/tools/[slug]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  try {
    const file = path.join(process.cwd(), "data", "tools", `${slug}.json`);
    const buf = await readFile(file, "utf8");
    const json = JSON.parse(buf);
    return NextResponse.json(json, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}
