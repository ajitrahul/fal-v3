import { writeFileSync, mkdirSync } from 'fs';
const base = process.env.SITE_URL || '';
mkdirSync('public', { recursive: true });
const lines = [
  'User-agent: *',
  'Allow: /',
  `Sitemap: ${base}/sitemap.xml`,
  `Sitemap: ${base}/sitemaps/tools.xml`,
  `Sitemap: ${base}/sitemaps/categories.xml`,
  `Sitemap: ${base}/sitemaps/tasks.xml`,
  `Sitemap: ${base}/sitemaps/roles.xml`,
  `Sitemap: ${base}/sitemaps/collections.xml`
];
writeFileSync('public/robots.txt', lines.join('\n'));
