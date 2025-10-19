// lib/newsletter.ts
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type Subscriber = {
  id: string;
  email: string;
  frequency: "daily" | "weekly";
  source?: string;              // e.g., "newsletter_page", "footer", "modal"
  created_at: string;           // ISO
  double_opt_in: boolean;       // future: flip after ESP confirmation
};

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "newsletter");
const FILE = path.join(DIR, "subscribers.json");

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

export async function readSubscribers(): Promise<Subscriber[]> {
  await ensureFile();
  try {
    const buf = await readFile(FILE, "utf-8");
    const arr = JSON.parse(buf);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function addSubscriber(input: {
  email: string;
  frequency: "daily" | "weekly";
  source?: string;
}): Promise<Subscriber> {
  await ensureFile();
  const list = await readSubscribers();
  const exists = list.find((s) => s.email.toLowerCase() === input.email.toLowerCase());
  if (exists) return exists;

  const rec: Subscriber = {
    id: crypto.randomUUID(),
    email: input.email,
    frequency: input.frequency,
    source: input.source,
    created_at: new Date().toISOString(),
    double_opt_in: false,
  };
  list.push(rec);
  await writeFile(FILE, JSON.stringify(list, null, 2), "utf-8");
  return rec;
}
