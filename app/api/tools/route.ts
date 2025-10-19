// app/api/tools/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

type Tool = {
  slug: string;
  name?: string;
  category?: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  image?: string;
};

async function readAllTools(): Promise<Tool[]> {
  const dir = path.join(process.cwd(), "data", "tools");
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const jsons = files.filter((f) => f.endsWith(".json"));
  const out: Tool[] = [];
  for (const f of jsons) {
    try {
      const raw = await readFile(path.join(dir, f), "utf8");
      const obj = JSON.parse(raw);
      out.push({
        slug: f.replace(/\.json$/i, ""),
        name: obj.name,
        category: obj.category,
        description: obj.description,
        website_url: obj.website_url,
        logo_url: obj.logo_url,
        image: obj.image,
      });
    } catch {
      // skip corrupt files
    }
  }
  return out;
}

export async function GET() {
  const tools = await readAllTools();
  return NextResponse.json({ ok: true, count: tools.length, tools });
}
