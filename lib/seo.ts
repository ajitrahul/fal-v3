// lib/seo.ts
import type { Metadata } from "next";
import { SITE_NAME } from "./brand";

export function listPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string; // e.g. `/categories/image-generation`
}): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "";
  const url = `${base}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function itemListJsonLd({
  title,
  items,
}: {
  title: string;
  items: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

export function breadcrumbsJsonLd(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}
