import { NextResponse } from 'next/server';

const startedAt = Date.now();

export async function GET() {
  const now = Date.now();
  const uptimeSec = Math.round((now - startedAt)/1000);
  return NextResponse.json({
    startedAtIso: new Date(startedAt).toISOString(),
    uptimeSeconds: uptimeSec
  });
}
