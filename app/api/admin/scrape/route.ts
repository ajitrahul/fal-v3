import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const token = req.headers.get('x-admin-token') || '';
  if ((process.env.ADMIN_TOKEN || '') !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { url } = await req.json().catch(()=>({}));
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (+ai-tools-directory)' } });
    const html = await r.text();
    const og = (prop: string) => {
      const m = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i').exec(html);
      return m ? m[1] : null;
    };
    const name = og('og:title');
    const desc = og('og:description');
    const image = og('og:image');
    const siteName = og('og:site_name');
    return NextResponse.json({ ok: true, name, desc, image, siteName });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
