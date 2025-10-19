// lib/comments.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type Comment = {
  id: string;
  slug: string;
  name: string;
  body: string;
  rating?: number;
  created_at: string;
};

const COMMENTS_DIR = path.join(process.cwd(), "data", "comments");

// Ensure comments directory exists
async function ensureDir() {
  await mkdir(COMMENTS_DIR, { recursive: true });
}

function fileFor(slug: string) {
  return path.join(COMMENTS_DIR, `${slug}.json`);
}

export async function readComments(slug: string): Promise<Comment[]> {
  try {
    await ensureDir();
    const buf = await readFile(fileFor(slug), "utf-8");
    const arr = JSON.parse(buf);
    return Array.isArray(arr) ? (arr as Comment[]) : [];
  } catch {
    return [];
  }
}

export async function addComment(
  slug: string,
  input: { name?: string; body?: string; rating?: number },
  meta?: { ip?: string | null; ua?: string }
): Promise<Comment> {
  await ensureDir();

  // Defensive coercion to prevent ".slice of undefined"
  const name = String(input?.name ?? "").trim();
  const body = String(input?.body ?? "").trim();
  const rating =
    typeof input?.rating === "number"
      ? Math.max(1, Math.min(5, Math.floor(input!.rating)))
      : undefined;

  // Basic guards (the route also validates, but keep here too)
  if (name.length < 2 || name.length > 60) {
    throw new Error("Invalid name length");
  }
  if (body.length < 5 || body.length > 4000) {
    throw new Error("Invalid body length");
  }

  const record: Comment = {
    id: crypto.randomUUID(),
    slug,
    name: name.slice(0, 60),
    body: body.slice(0, 4000),
    rating,
    created_at: new Date().toISOString(),
  };

  // Read, append, sort by newest
  const prev = await readComments(slug);
  const next = [record, ...prev].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  await writeFile(fileFor(slug), JSON.stringify(next, null, 2), "utf-8");

  // (Optional) basic log
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[comments][add]", { slug, name: record.name, rating: record.rating, ip: meta?.ip });
  }

  return record;
}
