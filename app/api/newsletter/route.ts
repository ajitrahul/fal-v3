import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok:false, error:'Invalid email' }, { status:400 });
  }
  const p = path.join(process.cwd(), 'data', 'newsletter.json');
  let items:any[]=[]; try{ items = JSON.parse(await fs.readFile(p,'utf-8')); } catch {}
  if (items.some(x => x.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ ok:true, dedup:true });
  }
  items.push({ email, ts: new Date().toISOString() });
  await fs.writeFile(p, JSON.stringify(items, null, 2));
  return NextResponse.json({ ok:true });
}
