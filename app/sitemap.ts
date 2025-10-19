// app/sitemap.ts
import type { MetadataRoute } from "next";
import { DB } from "@/lib/data";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/tools`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/compare`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const tools = (DB.tools as any[]) ?? [];
  const toolRoutes: MetadataRoute.Sitemap = tools
    .filter((t) => t?.slug)
    .map((t) => ({
      url: `${base}/tools/${String(t.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      // lastModified: t.updatedAt ? new Date(t.updatedAt) : undefined,
    }));

  return [...staticRoutes, ...toolRoutes];
}
