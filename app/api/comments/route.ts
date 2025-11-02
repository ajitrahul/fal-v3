// app/api/comments/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "comments.json");

async function readStore() {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { comments: {} as Record<string, any[]> };
  }
}
async function writeStore(data: any) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";
  const store = await readStore();
  const list = Array.isArray(store.comments?.[slug]) ? store.comments[slug] : [];
  return NextResponse.json({ ok: true, comments: list });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, author, text } = body || {};
    if (!slug || !text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "Missing slug or text" }, { status: 400 });
    }
    const entry = {
      id: crypto.randomUUID(),
      author: (author || "anon").slice(0, 64),
      text: text.slice(0, 5000),
      created_at: new Date().toISOString(),
    };
    const store = await readStore();
    store.comments = store.comments || {};
    store.comments[slug] = Array.isArray(store.comments[slug]) ? store.comments[slug] : [];
    store.comments[slug].unshift(entry);
    await writeStore(store);
    return NextResponse.json({ ok: true, comment: entry });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
