// app/api/debug-ai/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY!.length > 10;
  const model = process.env.AI_COMPARE_MODEL || "gemini-1.5-flash";
  const mock = process.env.AI_COMPARE_MOCK === "1";
  return NextResponse.json({
    ok: true,
    runtime: "nodejs",
    env: {
      GEMINI_API_KEY_present: hasKey,
      AI_COMPARE_MODEL: model,
      AI_COMPARE_MOCK: mock,
    },
  });
}
