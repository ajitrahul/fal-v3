// components/ToolHeader.server.tsx
import Link from "next/link";
import { DB } from "@/lib/data";

type Tool = {
  slug: string;
  name: string;
  description?: string | null;

  // website-ish
  website?: string | null;
  website_url?: string | null;
  site?: string | null;
  homepage?: string | null;
  homepage_url?: string | null;
  url?: string | null;
  links?: { website?: string | null; docs?: string | null } | null;

  // docs-ish
  docs?: string | null;
  docs_url?: string | null;
  documentation?: string | null;
  documentation_url?: string | null;
  official_docs?: string | null;

  // icon-ish (expanded)
  logo?: string | null;
  icon?: string | null;
  image?: string | null;
  images?: (string | { src?: string | null })[] | { logo?: string | null } | null;
  brand?: { logo?: string | null } | null;
  avatar?: string | null;
  thumbnail?: string | null;
  og_image?: string | null;
  banner?: string | null;
  favicon?: string | null;
  logo_url?: string | null;
  icon_url?: string | null;
};

function firstFromImages(images: Tool["images"]): string | null {
  if (!images) return null;
  if (Array.isArray(images)) {
    for (const it of images) {
      if (typeof it === "string" && it.trim()) return it;
      if (it && typeof it === "object" && typeof it.src === "string" && it.src.trim()) return it.src;
    }
    return null;
  }
  if (typeof images === "object" && (images as any).logo) return (images as any).logo || null;
  return null;
}

function getIconUrl(t: Partial<Tool>): string | null {
  return (
    t.logo_url ||
    t.icon_url ||
    t.logo ||
    t.icon ||
    t.image ||
    firstFromImages(t.images) ||
    t.brand?.logo ||
    t.avatar ||
    t.thumbnail ||
    t.og_image ||
    t.banner ||
    t.favicon ||
    null
  );
}

function initials(name: string) {
  const parts = (name || "?").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ensureHttp(u?: string | null): string | null {
  if (!u) return null;
  const s = u.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function getWebsiteUrl(t: Tool): string | null {
  const candidate =
    t.website_url ||
    t.website ||
    t.homepage_url ||
    t.homepage ||
    t.site ||
    t.links?.website ||
    (/^https?:\/\//i.test(t.url || "") ? t.url : null);
  return ensureHttp(candidate);
}

function getDocsUrl(t: Tool): string | null {
  const candidate =
    t.docs_url ||
    t.documentation_url ||
    t.docs ||
    t.documentation ||
    t.official_docs ||
    t.links?.docs ||
    null;
  return ensureHttp(candidate);
}

/** Renders a polished header for a tool detail page (UI-only). */
export default async function ToolHeaderServer({ tool }: { tool: Tool }) {
  const iconUrl = getIconUrl(tool);
  const website = getWebsiteUrl(tool);
  const docs = getDocsUrl(tool);

  return (
    <section className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-gray-200 bg-white">
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt={`${tool.name} logo`}
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                decoding="async"
              />
            ) : (
              <div className="h-full w-full grid place-items-center bg-sky-600 text-white text-lg font-semibold">
                {initials(tool.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight truncate" title={tool.name}>
              {tool.name}
            </h1>
            {tool.description ? (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{tool.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Visit site
            </a>
          ) : null}
          {docs ? (
            <a
              href={docs}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Official docs
            </a>
          ) : null}
          <Link
            href={`/compare?slugs=${encodeURIComponent(tool.slug)}`}
            className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            Add to Compare
          </Link>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </section>
  );
}

/** Convenience: use this if you only have a slug in your page. */
export async function ToolHeaderBySlug({ slug }: { slug: string }) {
  const tools = (DB.tools as Tool[]) ?? [];
  const tool = tools.find((t) => String(t.slug).toLowerCase() === String(slug).toLowerCase());
  if (!tool) return null;
  return <ToolHeaderServer tool={tool} />;
}
