// lib/ads.ts
import { readFile } from "node:fs/promises";
import path from "node:path";

export type Creative = {
  id: string;
  label: string;
  image: string;
  alt: string;
  href: string;
  advertiser: string;
  valid_from?: string;
  valid_to?: string;
  sponsored_label?: string;
};

export type Inventory = {
  placements: {
    [placement: string]: Creative[];
  };
};

const INV_PATH = path.join(process.cwd(), "data", "sponsorship", "inventory.json");
const SPON_PATH = path.join(process.cwd(), "data", "sponsorship", "sponsored-tools.json");

function isActive(c: Creative, now = Date.now()) {
  const from = c.valid_from ? new Date(c.valid_from).getTime() : -Infinity;
  const to = c.valid_to ? new Date(c.valid_to).getTime() : Infinity;
  return from <= now && now <= to;
}

export async function getCreative(placement: string): Promise<Creative | null> {
  try {
    const buf = await readFile(INV_PATH, "utf-8");
    const inv = JSON.parse(buf) as Inventory;
    const list = inv.placements?.[placement] || [];
    const now = Date.now();
    const active = list.filter((c) => isActive(c, now));
    return active[0] || null;
  } catch {
    return null;
  }
}

/** Try a specific placement then a fallback (e.g., "category_video" -> "category_sidebar"). */
export async function getCreativeWithFallback(
  primary: string,
  fallback?: string
): Promise<Creative | null> {
  const a = await getCreative(primary);
  if (a) return a;
  if (fallback) return getCreative(fallback);
  return null;
}

/** Returns a Set of sponsored tool slugs defined in JSON. */
export async function getSponsoredSet(): Promise<Set<string>> {
  try {
    const buf = await readFile(SPON_PATH, "utf-8");
    const list = JSON.parse(buf);
    if (Array.isArray(list)) return new Set(list.filter((s) => typeof s === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}
