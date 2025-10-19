import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const evt = await req.json();
  const p = path.join(process.cwd(), 'data', 'events.json');
  let items:any[]=[]; try{ items = JSON.parse(await fs.readFile(p,'utf-8')); } catch {}
  items.push({ ...evt, ts: new Date().toISOString() });
  await fs.writeFile(p, JSON.stringify(items, null, 2));
  return NextResponse.json({ ok:true });
}
