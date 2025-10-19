// app/page.tsx
export const dynamic = "force-dynamic";

import path from "path";
import { promises as fs } from "fs";
import HomeClient from "@/components/HomeClient";

async function loadAllTools(): Promise<any[]> {
  const dir = path.join(process.cwd(), "data", "tools");
  try {
    const files = await fs.readdir(dir);
    const jsons = files.filter((f) => f.toLowerCase().endsWith(".json"));
    const items: any[] = [];
    for (const f of jsons) {
      try {
        const raw = await fs.readFile(path.join(dir, f), "utf8");
        const obj = JSON.parse(raw);
        if (obj && obj.slug) items.push(obj);
      } catch {}
    }
    return items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const tools = await loadAllTools();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
          AI Tools Directory
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          Discover, filter, and compare AI tools. 
        </p>
      </header>

      {/* Client grid + filters */}
      <HomeClient tools={tools} />
    </main>
  );
}
