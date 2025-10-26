// app/page.tsx
import path from "path";
import { promises as fs } from "fs";
import HomeClient from "@/components/HomeClient";
import type { ToolEntry } from "@/lib/tools-data";

// Load all tool JSON files from /data/tools, ignore bad/duplicate files safely
async function loadAllTools(): Promise<ToolEntry[]> {
  const dir = path.join(process.cwd(), "data", "tools");
  let fileNames: string[] = [];
  try {
    fileNames = await fs.readdir(dir);
  } catch {
    // directory might not exist on first run/deploy
    return [];
  }

  const jsonFiles = fileNames.filter((f) => f.toLowerCase().endsWith(".json"));

  const results = await Promise.allSettled(
    jsonFiles.map(async (file) => {
      const full = path.join(dir, file);
      const raw = await fs.readFile(full, "utf8");
      const obj = JSON.parse(raw);
      // ensure slug; fall back to filename (without .json)
      if (!obj.slug || typeof obj.slug !== "string") {
        obj.slug = file.replace(/\.json$/i, "");
      }
      return obj as ToolEntry;
    })
  );

  // De-duplicate by slug and drop failed/invalid entries
  const seen = new Set<string>();
  const tools: ToolEntry[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const t = r.value as any;
    const slug = String(t?.slug || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    tools.push(t);
  }

  // Optional: sort by name (stable)
  tools.sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || "")));

  return tools;
}

export default async function HomePage() {
  const tools = await loadAllTools();
  return <HomeClient tools={tools} />;
}
