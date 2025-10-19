// app/api/debug-flags/route.ts
import { NextResponse } from 'next/server';
import { FLAGS } from '@/lib/flags';

export async function GET() {
  // Only include NEXT_PUBLIC_* to avoid leaking secrets
  const rawEnv: Record<string, string | undefined> = {};
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('NEXT_PUBLIC_')) {
      rawEnv[k] = process.env[k];
    }
  }
  return NextResponse.json({ ok: true, FLAGS, rawEnv });
}
