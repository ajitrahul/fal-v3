// lib/editorial.ts
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { DB } from "@/lib/data";

export type EditorialPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  date: string; // ISO
  tags?: string[];
  links?: { title: string; url: string }[];
};

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "editorial");
const FILE = path.join(DIR, "posts.json");

async function ensureFile() {
  try {
    await access(DIR);
  } catch {
    await mkdir(DIR, { recursive: true });
  }
  try {
    await access(FILE);
  } catch {
    await writeFile(FILE, "[]", "utf-8");
  }
}

export async function readEditorial(): Promise<EditorialPost[]> {
  await ensureFile();
  try {
    const buf = await readFile(FILE, "utf-8");
    const arr = JSON.parse(buf);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function recentToolUpdates(days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return DB.tools
    .filter((t) => {
      const d = new Date(t.updated_at || t.release_date || "1970-01-01").getTime();
      return Number.isFinite(d) && d >= cutoff;
    })
    .map((t) => ({
      title: `Updated: ${t.name}`,
      summary: t.tagline || t.summary || "",
      url: `/tools/${t.slug}`,
      date: t.updated_at || t.release_date || new Date().toISOString(),
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
