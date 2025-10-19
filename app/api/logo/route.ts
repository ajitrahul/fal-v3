// app/api/logo/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function domainFrom(input?: string | null) {
  if (!input) return null;
  try {
    // if a full URL was sent
    if (/^https?:\/\//i.test(input)) return new URL(input).host;
    // otherwise assume it's a bare domain
    return new URL('https://' + input).host;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = domainFrom(searchParams.get('domain') || searchParams.get('url'));
  if (!domain) {
    return Response.redirect(new URL('/logo-fallback.svg', req.url));
  }

  const s2 = `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3500);

  try {
    const r = await fetch(s2, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok || !r.body) throw new Error('bad response');
    const headers = new Headers(r.headers);
    headers.set('cache-control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    headers.set('content-type', 'image/png');
    return new Response(r.body, { headers });
  } catch {
    return Response.redirect(new URL('/logo-fallback.svg', req.url));
  }
}
