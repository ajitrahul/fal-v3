// lib/entities.ts
import { DB } from "@/lib/data";
import type { Tool } from "@/lib/types";

function norm(s: string) {
  return s.toLowerCase();
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type Entity = {
  name: string;
  slug: string; // derived from name
  count: number;
};

export function listCategoriesWithCounts(): Entity[] {
  const map = new Map<string, number>();
  for (const t of DB.tools) {
    for (const c of t.categories || []) {
      map.set(c, (map.get(c) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, slug: slugify(name) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function listTasksWithCounts(): Entity[] {
  const map = new Map<string, number>();
  for (const t of DB.tools) {
    for (const c of t.tasks || []) {
      map.set(c, (map.get(c) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, slug: slugify(name) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function listRolesWithCounts(): Entity[] {
  const map = new Map<string, number>();
  for (const t of DB.tools) {
    for (const c of t.job_roles || []) {
      map.set(c, (map.get(c) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, slug: slugify(name) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function resolveEntityNameFromSlug(slug: string, kind: "category" | "task" | "role"): string | null {
  const list =
    kind === "category" ? listCategoriesWithCounts()
    : kind === "task" ? listTasksWithCounts()
    : listRolesWithCounts();

  const found = list.find((e) => e.slug === slug);
  return found?.name || null;
}

export function toolsByCategoryName(name: string): Tool[] {
  const n = norm(name);
  return DB.tools.filter((t) => (t.categories || []).some((c) => norm(c) === n));
}

export function toolsByTaskName(name: string): Tool[] {
  const n = norm(name);
  return DB.tools.filter((t) => (t.tasks || []).some((c) => norm(c) === n));
}

export function toolsByRoleName(name: string): Tool[] {
  const n = norm(name);
  return DB.tools.filter((t) => (t.job_roles || []).some((c) => norm(c) === n));
}
