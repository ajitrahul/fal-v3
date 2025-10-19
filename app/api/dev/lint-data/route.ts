// app/api/dev/lint-data/route.ts
import { NextResponse } from "next/server";
import { lintData } from "@/lib/dev/lintData";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available in production." }, { status: 404 });
  }
  try {
    const res = lintData();
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Lint failed." }, { status: 500 });
  }
}
