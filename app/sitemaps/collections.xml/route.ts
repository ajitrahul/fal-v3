import { NextResponse } from 'next/server';
import data from '@/data/collections.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.SITE_URL || 'https://example.com';
  const items = (data as any[]);
  const urls = items.map((item:any) => ({ 
    loc: segUrl(item),
    lastmod: item.updated_at || item.release_date || undefined
  }));

  function segUrl(item:any) {
    switch ('collections') {
      case 'tools': return `${base}/tools/${item.slug}`;
      case 'categories': return `${base}/categories/${item.slug}`;
      case 'tasks': return `${base}/tasks/${item.slug}`;
      case 'roles': return `${base}/roles/${item.slug}`;
      case 'collections': return `${base}/collections/${item.slug}`;
      default: return base;
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(u => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n  ')}
</urlset>`;

  return new NextResponse(xml, { headers: { 'content-type': 'application/xml' } });
}
