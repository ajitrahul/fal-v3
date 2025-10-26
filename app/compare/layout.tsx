// app/compare/layout.tsx
import type { Metadata } from "next";
import { DB } from "@/lib/data";
import { buildAliasIndexFromDB } from "@/lib/aliases";

export const dynamic = "force-dynamic";

function parseSlugs(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const s = Array.isArray(raw) ? raw.join(",") : raw;
  return s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);
}

function canonicalize(slugs: string[]): string[] {
  const idx = buildAliasIndexFromDB();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    const c = (idx[s.toLowerCase()] ?? s).toLowerCase();
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
      if (out.length >= 3) break;
    }
  }
  return out;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const raw = parseSlugs(sp?.slugs);
  const canon = canonicalize(raw);

  const bySlug = new Map<string, any>((DB.tools as any[]).map((t) => [String(t.slug).toLowerCase(), t]));
  const names = canon.map((s) => bySlug.get(s)?.name || s).slice(0, 3);

  const title =
    names.length >= 2
      ? `Compare: ${names.join(" vs ")}`
      : `Compare tools`;

  const description =
    names.length >= 2
      ? `Side-by-side facts for ${names.join(", ")}.`
      : "Pick 2–3 tools to compare key facts side-by-side.";

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  const url = `${base}/compare${raw.length ? `?slugs=${encodeURIComponent(raw.join(","))}` : ""}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
