import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  if ((process.env.ADMIN_TOKEN || '') !== (req.headers.get('x-admin-token') || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const incoming = await req.json().catch(()=>null);
  if (!Array.isArray(incoming)) return NextResponse.json({ error: 'Expected a JSON array' }, { status: 400 });

  const file = path.join(process.cwd(), 'data', 'tools.json');
  let tools: any[] = [];
  try { tools = JSON.parse(await fs.readFile(file, 'utf-8')); } catch {}

  const bySlug = new Map<string, any>(tools.map(t => [t.slug, t]));
  let added = 0, updated = 0;

  for (const t of incoming) {
    if (!t.slug) continue;
    if (bySlug.has(t.slug)) {
      const merged = { ...bySlug.get(t.slug), ...t };
      bySlug.set(t.slug, merged);
      updated++;
    } else {
      bySlug.set(t.slug, t);
      added++;
    }
  }

  const out = Array.from(bySlug.values());
  await fs.writeFile(file, JSON.stringify(out, null, 2));

  return NextResponse.json({ ok: true, added, updated, count: out.length });
}
