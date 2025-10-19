import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const body = await req.json();
  const submissionsPath = path.join(process.cwd(), 'data', 'submissions.json');
  let items: any[] = [];
  try { items = JSON.parse(await fs.readFile(submissionsPath, 'utf-8')); } catch {}
  // Simple dedupe by URL or name
  if (items.some(x => x.website_url === body.website_url || x.name?.toLowerCase() === body.name?.toLowerCase())) {
    return NextResponse.json({ ok: false, error: 'Duplicate submission' }, { status: 400 });
  }
  items.push({ ...body, submitted_at: new Date().toISOString(), moderation_state: 'pending' });
  await fs.writeFile(submissionsPath, JSON.stringify(items, null, 2));
  return NextResponse.json({ ok: true });
}
