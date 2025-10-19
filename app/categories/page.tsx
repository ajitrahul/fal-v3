// app/categories/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { DB } from "@/lib/data";

function slugify(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function Categories() {
  const categories = (DB.categories || []).filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((c) => {
          const slug = slugify(c);
          const count = DB.tools.filter((t) =>
            asArray(t.categories).some((x) => slugify(x) === slug)
          ).length;

          return (
            <Link
              key={slug}
              href={`/categories/${slug}`}
              className="rounded-lg border bg-white p-3 hover:bg-gray-50 transition"
            >
              <div className="font-medium">{c}</div>
              <div className="text-xs text-gray-600 mt-1">{count} tools</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
