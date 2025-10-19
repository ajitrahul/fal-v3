// app/tools/[slug]/page.tsx
export const dynamic = "force-dynamic";

import path from "path";
import { promises as fs } from "fs";
import Link from "next/link";
import { notFound } from "next/navigation";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { Pill } from "@/components/Pill";
import { getCategoryTheme } from "@/lib/ui/category-theme";

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
    bot: (c?: string) => <Svg className={c} d="M12 2a5 5 0 0 1 5 5v1h1a3 3 0 1 1 0 6h-1.05A7.002 7.002 0 0 1 12 22a7 7 0 0 1-6.95-8H4a3 3 0 1 1 0-6h1V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3Z" />,
    mic: (c?: string) => <Svg className={c} d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />,
    video: (c?: string) => <Svg className={c} d="m17 10l4-2v8l-4-2v2H5V8h12z" />,
    db: (c?: string) => <Svg className={c} d="M12 3C7.03 3 3 4.57 3 6.5S7.03 10 12 10s9-1.57 9-3.5S16.97 3 12 3zm9 6c0 1.93-4.03 3.5-9 3.5S3 10.93 3 9v3.5C3 14.43 7.03 16 12 16s9-1.57 9-3.5V9zm0 6c0 1.93-4.03 3.5-9 3.5S3 16.93 3 15v3.5C3 20.43 7.03 22 12 22s9-1.57 9-3.5V15z" />,
    shield: (c?: string) => <Svg className={c} d="M12 2l7 4v6c0 5-3.5 9-7 10c-3.5-1-7-5-7-10V6l7-4z" />,
    pencil: (c?: string) => <Svg className={c} d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z" />,
    chart: (c?: string) => <Svg className={c} d="M3 3h2v18H3V3zm16 8h2v10h-2V11zM11 7h2v14h-2V7zM7 13h2v8H7v-8z" />,
    globe: (c?: string) => <Svg className={c} d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm0 2c2.21 0 4.21.9 5.66 2.34L12 12l-5.66-5.66A7.98 7.98 0 0 1 12 4z" />,
    tag: (c?: string) => <Svg className={c} d="M10 4l10 10l-6 6L4 10V4h6zm-2 4a2 2 0 1 0-4 0a2 2 0 0 0 4 0z" />,
  };

  if (key.includes("rag") || key.includes("search")) return icons.search;
  if (["vision", "multimodal", "image"].some(k => key.includes(k))) return icons.eye;
  if (["code", "developer tools", "sdk"].some(k => key.includes(k))) return icons.code;
  if (["agent", "automation", "orchestration"].some(k => key.includes(k))) return icons.bot;
  if (["speech", "audio", "voice"].some(k => key.includes(k))) return icons.mic;
  if (key.includes("video")) return icons.video;
  if (["data", "embeddings", "vector db"].some(k => key.includes(k))) return icons.db;
  if (["security", "compliance"].some(k => key.includes(k))) return icons.shield;
  if (["writing", "content"].some(k => key.includes(k))) return icons.pencil;
  if (key.includes("analytics")) return icons.chart;
  if (key.includes("platform")) return icons.globe;
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
export default async function ToolDetailsPage({ params }: { params: { slug: string } }) {
  const tool = await loadTool(params.slug);
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
              <span className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                {String(tool.name || "").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">{tool.name}</h1>
            <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{tool.description}</p>
            {tool.category && (
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${theme.chip}`}>
                {CatIcon("h-3.5 w-3.5")}
                {tool.category}
              </span>
            )}
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

      {/* Media: default Video; else Site (no extra client JS, pure HTML radios) */}
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

          <div className="mt-3 rounded-xl overflow-hidden border bg-black/5 border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-800">
            {hasVideo && (
              <div className="block peer/site:hidden">
                <YouTubeEmbed url={videoUrl} title={tool.name} />
              </div>
            )}
            {hasShot && (
              <div className={hasVideo ? "hidden peer/site:block" : "block"}>
                <img src={shot!} alt={`${tool.name} site preview`} className="w-full h-auto" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pricing */}
      {Array.isArray(tool.pricing_plans) && tool.pricing_plans.length > 0 && (
        <section id="pricing" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Pricing</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tool.pricing_plans.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
                <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{p?.name || "Plan"}</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                  {p?.price === 0 || String(p?.price).toLowerCase() === "free"
                    ? "Free"
                    : p?.price ?? "—"}
                  <span className="ml-1 text-sm text-gray-600 dark:text-zinc-400">
                    {p?.currency ? ` ${p.currency}` : ""}{p?.billing_cycle ? `/${p.billing_cycle}` : ""}
                  </span>
                </div>
                {p?.features && Array.isArray(p.features) && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 dark:text-zinc-300">
                    {p.features.slice(0, 6).map((f: any, j: number) => (
                      <li key={j}>{typeof f === "string" ? f : f?.title || f?.name || "Feature"}</li>
                    ))}
                  </ul>
                )}
                {p?.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline decoration-dotted underline-offset-2 text-gray-900 dark:text-zinc-100">
                    View plan
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section id="features" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Features</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {features.map((f: any, i: number) => (
              <li key={i} className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
                <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {typeof f === "string" ? f : f?.title || f?.name || "Feature"}
                </div>
                {typeof f === "object" && f?.details && (
                  <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{f.details}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Technical */}
      {(models.length > 0 || integrations.length > 0 || sdks.length > 0) && (
        <section id="technical" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Technical</h2>

          {models.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">Models</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {models.map((m: any, i: number) => (
                  <Pill key={i} className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800">
                    {[m?.name, m?.provider, m?.modality].filter(Boolean).join(" · ") || (typeof m === "string" ? m : "Model")}
                  </Pill>
                ))}
              </div>
            </div>
          )}

          {integrations.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">Integrations</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {integrations.map((v: any, i: number) => (
                  <Pill key={i} className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                    {typeof v === "string" ? v : v?.name || v?.title || "Integration"}
                  </Pill>
                ))}
              </div>
            </div>
          )}

          {sdks.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">SDK languages</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sdks.map((v: any, i: number) => (
                  <Pill key={i} className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                    {typeof v === "string" ? v : v?.name || v?.title || "SDK"}
                  </Pill>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Security */}
      {tool?.technical_information?.security && (
        <section id="security" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Security</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="text-sm text-gray-700 dark:text-zinc-300">
                <span className="font-medium">Encryption in transit:</span>{" "}
                {tool.technical_information.security.encryption_in_transit ? "Yes" : "No"}
              </div>
              <div className="mt-1 text-sm text-gray-700 dark:text-zinc-300">
                <span className="font-medium">Encryption at rest:</span>{" "}
                {tool.technical_information.security.encryption_at_rest ? "Yes" : "No"}
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">Compliance</div>
              {certs.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {certs.map((c: any, i: number) => (
                    <Pill key={i} className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800">
                      {typeof c === "string" ? c : c?.name || c?.title || "Certification"}
                    </Pill>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">No certifications listed.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Use cases */}
      {useCases.length > 0 && (
        <section id="usecases" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Use cases</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {useCases.map((u: any, i: number) => (
              <div key={i} className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
                <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {typeof u === "string" ? u : u?.title || u?.name || "Use case"}
                </div>
                {typeof u === "object" && u?.details && (
                  <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{u.details}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pros & Cons */}
      {(pros.length > 0 || cons.length > 0) && (
        <section id="proscons" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Pros & Cons</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">Pros</div>
              {pros.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-700 dark:text-zinc-300">
                  {pros.map((p: any, i: number) => <li key={i}>{typeof p === "string" ? p : p?.title || p?.name || "Pro"}</li>)}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">—</p>
              )}
            </div>
            <div className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">Cons</div>
              {cons.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-700 dark:text-zinc-300">
                  {cons.map((c: any, i: number) => <li key={i}>{typeof c === "string" ? c : c?.title || c?.name || "Con"}</li>)}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">—</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Ratings */}
      {ratings.length > 0 && (
        <section id="ratings" className="mt-6 card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Ratings</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ratings.map((r: any, i: number) => (
              <div key={i} className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
                <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{r?.source || "Source"}</div>
                <div className="mt-1 text-sm text-gray-700 dark:text-zinc-300">
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{r?.rating ?? "—"}</span>
                  {r?.max && <> / {r.max}</>}
                  {r?.count != null && <> — {kFormat(r.count)} reviews</>}
                </div>
                {r?.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm underline decoration-dotted underline-offset-2 text-gray-900 dark:text-zinc-100">
                    View on {r.source || "site"}
                  </a>
                )}
                {r?.quote && (
                  <blockquote className="mt-2 rounded-lg border px-3 py-2 text-sm italic bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800">
                    “{r.quote}”
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
