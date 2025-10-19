// app/api/newsletter/subscribe/route.ts
import { NextResponse } from "next/server";
import { addSubscriber, readSubscribers } from "@/lib/newsletter";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function GET() {
  const subs = await readSubscribers();
  return NextResponse.json({ count: subs.length }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const frequency = (String(body.frequency || "daily").toLowerCase() === "weekly" ? "weekly" : "daily") as
    | "daily"
    | "weekly";
  const source = body.source ? String(body.source).slice(0, 80) : "newsletter_page";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  }

  try {
    const sub = await addSubscriber({ email, frequency, source });
    return NextResponse.json({ ok: true, subscriber_id: sub.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
