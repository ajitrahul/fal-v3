// app/api/comments/[slug]/route.ts
import { NextResponse } from "next/server";
import { readComments, addComment } from "@/lib/comments";

/**
 * Simple in-memory throttle:
 * - Key: `${ip || 'anon'}::${slug}`
 * - Window: 60 seconds
 * Uses globalThis to persist across dev HMR.
 */
declare global {
  // eslint-disable-next-line no-var
  var __COMMENT_THROTTLE__: Map<string, number> | undefined;
}
const THROTTLE_MS = 60_000;

const throttleMap: Map<string, number> =
  globalThis.__COMMENT_THROTTLE__ ?? new Map<string, number>();
globalThis.__COMMENT_THROTTLE__ = throttleMap;

function now() {
  return Date.now();
}

function clientIp(req: Request): string {
  // x-forwarded-for: "ip, proxy1, proxy2"
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  // last resort (dev)
  return "127.0.0.1";
}

function checkThrottle(key: string) {
  const ts = throttleMap.get(key);
  if (!ts) return { allowed: true, retryAfter: 0 };
  const diff = now() - ts;
  if (diff >= THROTTLE_MS) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.ceil((THROTTLE_MS - diff) / 1000) };
}

function touchThrottle(key: string) {
  throttleMap.set(key, now());
  // best-effort cleanup for stale entries (optional)
  if (throttleMap.size > 500) {
    const cutoff = now() - THROTTLE_MS * 10;
    for (const [k, ts] of throttleMap) {
      if (ts < cutoff) throttleMap.delete(k);
    }
  }
}

// GET /api/comments/[slug]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params; // Next 15: await params
  const comments = await readComments(slug);
  return NextResponse.json(
    { ok: true, comments },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// POST /api/comments/[slug]
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params; // Next 15: await params

  // Throttle check
  const ip = clientIp(req);
  const key = `${ip}::${slug}`;
  const { allowed, retryAfter } = checkThrottle(key);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Hold on—please wait a bit before posting again.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const txt = String(body?.body || "").trim();
    const ratingRaw = body?.rating;
    const rating =
      typeof ratingRaw === "number"
        ? Math.max(1, Math.min(5, Math.round(ratingRaw)))
        : undefined;

    // Validation (mirrors client form)
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { ok: false, error: "Please use 2–60 characters in name." },
        { status: 400 }
      );
    }
    if (!txt || txt.length < 5 || txt.length > 4000) {
      return NextResponse.json(
        { ok: false, error: "Comment must be 5–4000 characters." },
        { status: 400 }
      );
    }

    // Passed validation → apply throttle stamp
    touchThrottle(key);

    const ua = req.headers.get("user-agent") || undefined;
    const saved = await addComment(slug, { name, body: txt, rating }, { ip, ua });

    return NextResponse.json({ ok: true, comment: saved }, { status: 200 });
  } catch (e) {
    console.error("[comments][POST] error", e);
    return NextResponse.json({ ok: false, error: "Failed to add comment" }, { status: 500 });
  }
}
