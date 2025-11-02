// app/tools/[slug]/page.tsx
export const dynamic = "force-dynamic";

import path from "path";
import { promises as fs } from "fs";
import Link from "next/link";
import { notFound } from "next/navigation";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { Pill } from "@/components/Pill";
import { getCategoryTheme } from "@/lib/ui/category-theme";
import CommentsSection from "@/components/CommentsSection";

type Tool = any;

/* -------------------- helpers -------------------- */
async function loadTool(slug: string): Promise<Tool | null> {
  try {
    const file = path.join(process.cwd(), "data", "tools", `${slug}.json`);
    const raw = await fs.readFile(file, "utf8");
    const obj = JSON.parse(raw);
    return obj && obj.slug ? obj : null;
  } catch {
    return null;
  }
}

function categoryIcon(category?: string) {
  const key = (category || "").toLowerCase();
  const Svg = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d={d} />
    </svg>
  );
  const icons = {
    search: (c?: string) => <Svg className={c} d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79l4.25 4.25a1 1 0 0 0 1.42-1.42L15.5 14ZM10 14a4 4 0 1 1 0-8a4 4 0 0 1 0 8Z" />,
    eye: (c?: string) => <Svg className={c} d="M12 5c5 0 9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 2c-3.86 0-7.16 3.11-8.38 5C4.84 13.89 8.14 17 12 17s7.16-3.11 8.38-5C19.16 10.11 15.86 7 12 7Zm0 2.5A2.5 2.5 0 1 1 9.5 12A2.5 2.5 0 0 1 12 9.5Z" />,
    code: (c?: string) => <Svg className={c} d="M8.59 16.59L4 12l4.59-4.59L10 8.83L6.83 12L10 15.17zM15.41 7.41L20 12l-4.59 4.59L14 15.17L17.17 12L14 8.83z" />,
    bot: (c?: string) => <Svg className={c} d="M9 11a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9zM12 2a2 2 0 0 0-2 2v1H6a3 3 0 0 0-3 3v3a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5V8a3 3 0 0 0-3-3h-4V4a2 2 0 0 0-2-2z" />,
    // fallback icon
    globe: (c?: string) => <Svg className={c} d="M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2zM4 12a8 8 0 0 1 14.9-2H12v2h8.9A8 8 0 0 1 4 12z" />,
  };
  if (key.includes("search") || key.includes("rag")) return icons.search;
  if (key.includes("vision") || key.includes("image")) return icons.eye;
  if (key.includes("code") || key.includes("sdk")) return icons.code;
  if (key.includes("agent")) return icons.bot;
  return icons.globe;
}

function linkOf(tool: Tool, keys: string[]) {
  for (const k of keys) {
    const v = (tool as any)?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function screenshotUrl(site?: string | null, w = 1200) {
  if (!site) return null;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(site)}?w=${w}`;
}
function pickVideoUrl(t: Tool) {
  const v =
    (typeof (t as any).official_video === "string" ? (t as any).official_video : "") ||
    (Array.isArray((t as any).tutorials_youtube) && (t as any).tutorials_youtube[0]?.url) ||
    "";
  return (typeof v === "string" ? v.trim() : "") || "";
}
function toArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [x];
}
function kFormat(n?: number) {
  if (n == null) return "";
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return (n / 1_000).toFixed(n % 1000 ? 1 : 0) + "k";
  return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + "m";
}

/* -------------------- page -------------------- */
export default async function ToolDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ← await params per Next 15 dynamic APIs
  const tool = await loadTool(slug);
  if (!tool) return notFound();

  const theme = getCategoryTheme(tool.category);
  const CatIcon = categoryIcon(tool.category);

  const website = linkOf(tool, ["website_url", "homepage", "url"]);
  const docs = linkOf(tool, ["documentation_url", "docs_url", "developer_docs"]);
  const github = linkOf(tool, ["github_url", "repo_url"]);
  const pricingUrl = linkOf(tool, ["pricing_url", "plans_url"]);

  const videoUrl = pickVideoUrl(tool);
  const hasVideo = !!videoUrl;
  const shot = screenshotUrl(website);
  const hasShot = !!shot;

  const models = toArray(tool.models);
  const features = toArray(tool.features);
  const pros = toArray(tool.pros);
  const cons = toArray(tool.cons);
  const useCases = toArray(tool.use_cases);
  const integrations = toArray(tool?.technical_information?.integrations);
  const sdks = toArray(tool?.technical_information?.sdk_languages);
  const certs = toArray(tool?.technical_information?.security?.compliance_certifications);
  const ratings = toArray(tool?.ratings);

  const nav: Array<{ id: string; label: string; visible: boolean }> = [
    { id: "overview", label: "Overview", visible: true },
    { id: "media", label: "Media", visible: hasVideo || hasShot },
    { id: "pricing", label: "Pricing", visible: Array.isArray(tool?.pricing_plans) && tool.pricing_plans.length > 0 },
    { id: "features", label: "Features", visible: features.length > 0 },
    { id: "technical", label: "Technical", visible: models.length > 0 || integrations.length > 0 || sdks.length > 0 },
    { id: "security", label: "Security", visible: !!tool?.technical_information?.security },
    { id: "usecases", label: "Use cases", visible: useCases.length > 0 },
    { id: "proscons", label: "Pros & Cons", visible: pros.length > 0 || cons.length > 0 },
    { id: "ratings", label: "Ratings", visible: ratings.length > 0 },
    { id: "resources", label: "Resources", visible: !!(website || docs || github || pricingUrl) },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl ring-1 ring-gray-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
            {tool.logo_url ? (
              <img src={tool.logo_url} alt={tool.name} className="h-14 w-14 object-contain" />
            ) : (
              <span className="text-sm font-semibold text-gray-600 dark:text-zinc-300">{String(tool.name || "").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">{tool.name}</h1>
            <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{tool.description}</p>
            {tool.category && <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${theme.chip}`}>{CatIcon("h-3.5 w-3.5")}{tool.category}</span>}
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${theme.btnOutline} ${theme.btnOutlineHover}`}>Back</Link>
          {website && <a href={website} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${theme.btnSolid} ${theme.btnSolidHover}`}>Visit website</a>}
          {docs && <a href={docs} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${theme.btnOutline} ${theme.btnOutlineHover}`}>Docs</a>}
          {github && <a href={github} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${theme.btnOutline} ${theme.btnOutlineHover}`}>GitHub</a>}
          {pricingUrl && <a href={pricingUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${theme.btnOutline} ${theme.btnOutlineHover}`}>Pricing</a>}
        </div>
      </header>

      {/* On this page (horizontal) */}
      <nav className="mt-6 overflow-x-auto">
        <ol className="flex items-center gap-2 min-w-max">
          {nav.filter(n => n.visible).map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} className="inline-flex items-center rounded-full border px-3 py-1 text-sm bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-950 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-900/60">
                {n.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Overview */}
      <section id="overview" className="mt-6 card p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Overview</h2>
        {tool.key_differentiator && (
          <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
            <span className="font-medium text-gray-900 dark:text-zinc-100">Why it’s different — </span>
            <em>{tool.key_differentiator}</em>
          </p>
        )}
        {Array.isArray(tool.best_for) && tool.best_for.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tool.best_for.slice(0, 6).map((x: any, i: number) => (
              <Pill key={i} className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {typeof x === "string" ? x : x?.title || x?.name || "Use case"}
              </Pill>
            ))}
          </div>
        )}
      </section>

      {/* Media, Pricing, Features, etc. (kept unchanged) */}
      {(hasVideo || hasShot) && (
        <section id="media" className="mt-6 card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Media</h2>
            <div className="flex items-center gap-2">
              {hasVideo && (
                <>
                  <input id="tab-video" name="media" type="radio" defaultChecked={hasVideo} className="peer/video sr-only" />
                  <label htmlFor="tab-video" className="cursor-pointer inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-950 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-900/60">
                    Video
                  </label>
                </>
              )}
              {hasShot && (
                <>
                  <input id="tab-site" name="media" type="radio" defaultChecked={!hasVideo} className="peer/site sr-only" />
                  <label htmlFor="tab-site" className="cursor-pointer inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white text-gray-800 border-gray-200 hover:bg-gray-50 dark:bg-zinc-950 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-900/60">
                    Site
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="mt-3">
            {hasVideo && (
              <div className="prose-sm max-w-none">
                <YouTubeEmbed url={videoUrl} />
              </div>
            )}
            {!hasVideo && hasShot && (
              <div className="rounded-md overflow-hidden border">
                <img src={shot as string} alt={tool.name + " screenshot"} className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ... rest of your existing sections (pricing, features, technical, security, usecases, proscons, ratings) untouched ... */}

      {/* Comments Section (client component) */}
      <CommentsSection toolSlug={slug} />

      {/* Resources */}
      {(website || docs || github || pricingUrl) && (
        <section id="resources" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Resources</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {website && <a href={website} target="_blank" rel="noopener noreferrer" className="btn-outline">Website</a>}
            {docs && <a href={docs} target="_blank" rel="noopener noreferrer" className="btn-outline">Docs</a>}
            {github && <a href={github} target="_blank" rel="noopener noreferrer" className="btn-outline">GitHub</a>}
            {pricingUrl && <a href={pricingUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">Pricing</a>}
            <Link href={`/compare?tools=${encodeURIComponent(tool.slug)}`} className="btn-solid">Compare</Link>
          </div>
        </section>
      )}
    </main>
  );
}
