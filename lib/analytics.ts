// lib/analytics.ts
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

export type OutboundEvent = {
  t: string;                 // ISO time
  slug: string;              // tool slug
  to: string;                // final URL (with UTM)
  ip?: string | null;
  ua?: string | null;
  ref?: string | null;
  ctx?: string | null;       // e.g., "tool_page", "card", "banner"
};

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "analytics");
const FILE = path.join(DIR, "outbound.json");

async function ensureFile() {
  try { await access(DIR); } catch { await mkdir(DIR, { recursive: true }); }
  try { await access(FILE); } catch { await writeFile(FILE, "[]", "utf-8"); }
}

export async function logOutbound(ev: OutboundEvent) {
  await ensureFile();
  try {
    const buf = await readFile(FILE, "utf-8");
    const arr = JSON.parse(buf);
    if (Array.isArray(arr)) {
      arr.push(ev);
      // keep file from growing unbounded in dev
      if (arr.length > 50000) arr.splice(0, arr.length - 50000);
      await writeFile(FILE, JSON.stringify(arr, null, 2), "utf-8");
    }
  } catch {
    // ignore write errors in dev
  }
}
