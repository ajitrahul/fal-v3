// lib/slug.ts
export const slugify = (s: string) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// convenience, in case you still use name→slug elsewhere
export const categoryToSlug = (name: string) => slugify(name);
