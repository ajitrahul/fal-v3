import { NextResponse } from 'next/server';
import pkg from '../../../../package.json' assert { type: 'json' };
import { promises as fs } from 'fs';
import path from 'path';

const startedAt = Date.now();

export async function GET() {
  const env = {
    SITE_URL: !!process.env.SITE_URL,
    ADMIN_TOKEN: !!process.env.ADMIN_TOKEN,
    NEXT_PUBLIC_GA4_ID: !!process.env.NEXT_PUBLIC_GA4_ID,
    node: process.version,
    next: pkg.dependencies?.next || 'unknown',
    react: pkg.dependencies?.react || 'unknown',
    mode: process.env.NODE_ENV || 'development'
  };

  const dataDir = path.join(process.cwd(), 'data');
  async function countFile(name: string) {
    try {
      const text = await fs.readFile(path.join(dataDir, name), 'utf-8');
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr.length : 0;
    } catch { return 0; }
  }

  const data = {
    tools: await countFile('tools.json'),
    submissions: await countFile('submissions.json'),
    events: await countFile('events.json'),
    newsletter: await countFile('newsletter.json')
  };

  const uptime = Math.round((Date.now() - startedAt)/1000);
  const cacheInfo = {
    nodeEnv: env.mode,
    isDev: env.mode !== 'production'
  };

  const endpoints = {
    sitemap: '/sitemap.xml',
    sitemaps: ['/sitemaps/tools.xml','/sitemaps/categories.xml','/sitemaps/tasks.xml','/sitemaps/roles.xml','/sitemaps/collections.xml'],
    robots: '/robots.txt'
  };

  return NextResponse.json({ env, data, uptimeSeconds: uptime, cacheInfo, endpoints });
}
