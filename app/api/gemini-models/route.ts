import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = process.env.GEMINI_API_KEY?.trim();
const ENDPOINT =
  process.env.GEMINI_ENDPOINT?.trim() ||
  "https://generativelanguage.googleapis.com/v1";

function j(res: any, status = 200) {
  return NextResponse.json(res, { status });
}

export async function GET() {
  if (!KEY) return j({ ok: false, error: "Missing GEMINI_API_KEY" }, 500);

  // List all available models for this key/project
  const url = `${ENDPOINT}/models?key=${encodeURIComponent(KEY)}`;

  try {
    const r = await fetch(url, { method: "GET" });
    const raw = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
    return j(
      {
        ok: r.ok,
        status: r.status,
        endpoint: ENDPOINT,
        // For convenience, show just names too:
        names:
          r.ok && data?.models
            ? data.models.map((m: any) => m.name)
            : undefined,
        raw: data,
        tip:
          "Set GEMINI_MODEL to one of the names above, e.g. models/gemini-1.5-flash",
      },
      r.ok ? 200 : 500
    );
  } catch (e: any) {
    return j({ ok: false, error: e?.message || "Request failed" }, 500);
  }
}
