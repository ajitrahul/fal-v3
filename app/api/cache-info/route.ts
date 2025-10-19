import { NextResponse } from 'next/server';

export async function GET() {
  const mode = process.env.NODE_ENV || 'development';
  const isDev = mode !== 'production';
  return NextResponse.json({
    nodeEnv: mode,
    isDev,
    note: isDev
      ? 'Development mode: ISR and edge caching are not representative. Build a production preview to validate.'
      : 'Production mode: ISR/route cache headers apply. Ensure revalidate settings on pages as needed.'
  });
}
