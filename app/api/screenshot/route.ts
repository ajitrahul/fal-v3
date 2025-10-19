// app/api/screenshot/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeUrl(u?: string | null) {
  if (!u) return null;
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).toString();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = normalizeUrl(searchParams.get('url'));
  if (!target) return Response.redirect(new URL('/screenshot-fallback.svg', req.url));

  // thum.io simple proxy. If it fails, we fall back to local SVG.
  const shot = `https://image.thum.io/get/width/1200/crop/800/${encodeURIComponent(target)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);

  try {
    const r = await fetch(shot, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok || !r.body) throw new Error('bad response');
    const headers = new Headers(r.headers);
    headers.set('cache-control', 'public, max-age=21600, s-maxage=21600, stale-while-revalidate=604800');
    headers.set('content-type', headers.get('content-type') || 'image/jpeg');
    return new Response(r.body, { headers });
  } catch {
    return Response.redirect(new URL('/screenshot-fallback.svg', req.url));
  }
}
