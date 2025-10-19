// lib/categories-normalize.ts
import { normalizeCategories, type ResolvedCategory } from "@/lib/categoryAliases";

/**
 * Takes `categories` from a tool JSON (string|string[]|undefined) and returns
 * an ordered, de-duped array of {name, slug}, where the **first** is primary.
 */
export function normalizeToolCategories(input: string[] | string | undefined): ResolvedCategory[] {
  return normalizeCategories(input);
}
