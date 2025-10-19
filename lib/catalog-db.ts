// lib/catalog-db.ts
// Compatibility shim so pages that use `DB.tools` keep working.
// No UI/layout changes. Server-only.

import 'server-only';
import { getAllTools, Tool } from './data';

export type Category = { name: string; slug: string; count: number };

function slugify(x: string): string {
  return x
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveCategories(tools: Tool[]): Category[] {
  const counts = new Map<string, number>();
  for (const t of tools) {
    const cat = (t.main_category || '').trim();
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const arr = Array.from(counts.entries()).map(([name, count]) => ({
    name,
    slug: slugify(name),
    count,
  }));
  // Sort by count desc, then name asc for stability
  arr.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
  return arr;
}

// Build the DB shape expected by pages
const tools = getAllTools();
const categories = deriveCategories(tools);

const DB = {
  tools,
  categories,
};

export default DB;
export { tools, categories };
