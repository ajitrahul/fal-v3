// app/api/debug-data/route.ts
import { NextResponse } from "next/server";
import { DB } from "@/lib/data";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const dataDir = path.join(process.cwd(), "data");
  const toolsDir = path.join(dataDir, "tools");
  let files: string[] = [];
  try {
    if (fs.existsSync(toolsDir)) {
      files = fs.readdirSync(toolsDir).filter((f) => f.toLowerCase().endsWith(".json"));
    }
  } catch {}

  const sample = DB.tools.slice(0, 10).map((t) => ({
    slug: t.slug,
    name: t.name,
    cats: Array.isArray(t.categories) ? t.categories.slice(0, 3) : [],
  }));

  return NextResponse.json({
    cwd: process.cwd(),
    dataDirExists: fs.existsSync(dataDir),
    toolsDirExists: fs.existsSync(toolsDir),
    filesInToolsDir: files,
    toolsCount: DB.tools.length,
    categoriesCount: DB.categories.length,
    sample,
  });
}
