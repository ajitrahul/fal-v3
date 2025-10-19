// app/categories/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const dynamicParams = true;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ToolCard from "@/components/ToolCard";
import { DB } from "@/lib/data";
import { getSponsoredSet } from "@/lib/ads";

function slugify(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function titleizeSlug(slug: string): string {
  return slug.split("-").map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(" ");
}
function asArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export async function generateStaticParams() {
  const cats = DB.categories || [];
  return cats.map((c) => ({ slug: slugify(c) }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cats = DB.categories || [];
  const label = cats.find((c) => slugify(c) === slug) || titleizeSlug(slug);
  return { title: `${label} – FindAIList`, description: `Explore AI tools in ${label}.` };
}

export default async function CategoryPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const cats = DB.categories || [];
  const label = cats.find((c) => slugify(c) === slug) || titleizeSlug(slug);
  if (!label) notFound();

  const sponsored = await getSponsoredSet();
  const list = DB.tools.filter((t) => asArray(t.categories).some((c) => slugify(c) === slug));
  if (!list.length) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{label}</h1>
        <p className="text-sm text-gray-600">{list.length} tools</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((t) => (
          <ToolCard key={t.id} tool={t} sponsored={sponsored.has(t.slug)} ctx="category_card" />
        ))}
      </section>
    </div>
  );
}
