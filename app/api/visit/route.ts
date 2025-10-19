import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

function getIpHash(headers: Headers) {
  const xfwd = headers.get('x-forwarded-for') || headers.get('x-real-ip') || '';
  const ip = xfwd.split(',')[0].trim();
  const salt = process.env.SITE_URL || 'insightforge-salt';
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + ':' + salt).digest('hex').slice(0, 24);
}

export async function POST(req: Request) {
  const hdr = req.headers;
  const body = await req.json().catch(()=>({}));

  const ip_hash = getIpHash(hdr);
  const ua = hdr.get('user-agent') || '';
  const ref = hdr.get('referer') || '';

  const geo = {
    country: hdr.get('x-vercel-ip-country') || hdr.get('cf-ipcountry') || (body.country || null),
    region: hdr.get('x-vercel-ip-country-region') || body.region || null,
    city: hdr.get('x-vercel-ip-city') || body.city || null
  };

  const payload = {
    type: 'visit',
    ts: new Date().toISOString(),
    path: body.path || null,
    lang: body.lang || null,
    tz: body.tz || null,
    screen: body.screen || null,
    utm: body.utm || null,
    ip_hash, ua, ref, geo
  };

  try {
    const eventsPath = path.join(process.cwd(), 'data', 'events.json');
    let events: any[] = [];
    try { events = JSON.parse(await fs.readFile(eventsPath, 'utf-8')); } catch {}
    events.push(payload);
    await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
  } catch {}

  return NextResponse.json({ ok: true });
}
