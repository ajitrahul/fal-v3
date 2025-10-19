import { NextResponse } from 'next/server';
import pkg from '../../../package.json' assert { type: 'json' };

export async function GET() {
  const env = {
    SITE_URL: !!process.env.SITE_URL,
    ADMIN_TOKEN: !!process.env.ADMIN_TOKEN,
    NEXT_PUBLIC_GA4_ID: !!process.env.NEXT_PUBLIC_GA4_ID,
    node: process.version,
    next: pkg.dependencies?.next || 'unknown',
    react: pkg.dependencies?.react || 'unknown',
    mode: process.env.NODE_ENV || 'development'
  };
  return NextResponse.json(env);
}
