"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/Pill";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import type { ToolEntry } from "@/lib/tools-data";
import { getCategoryTheme } from "@/lib/ui/category-theme";

/* ---------------- Inline icons (no extra deps) ---------------- */
const Svg = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);
const Icons = {
  search: (c?: string) => <Svg className={c} d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79l4.25 4.25a1 1 0 0 0 1.42-1.42L15.5 14ZM10 14a4 4 0 1 1 0-8a4 4 0 0 1 0 8Z" />,
  eye: (c?: string) => <Svg className={c} d="M12 5c5 0 9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 2c-3.86 0-7.16 3.11-8.38 5C4.84 13.89 8.14 17 12 17s7.16-3.11 8.38-5C19.16 10.11 15.86 7 12 7Zm0 2.5A2.5 2.5 0 1 1 9.5 12A2.5 2.5 0 0 1 12 9.5Z" />,
  code: (c?: string) => <Svg className={c} d="M8.59 16.59L4 12l4.59-4.59L10 8.83L6.83 12L10 15.17zM15.41 7.41L20 12l-4.59 4.59L14 15.17L17.17 12L14 8.83z" />,
  bot: (c?: string) => <Svg className={c} d="M12 2a5 5 0 0 1 5 5v1h1a3 3 0 1 1 0 6h-1.05A7.002 7.002 0 0 1 12 22a7 7 0 0 1-6.95-8H4a3 3 0 1 1 0-6h1V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3Z" />,
  mic: (c?: string) => <Svg className={c} d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />,
  video: (c?: string) => <Svg className={c} d="m17 10l4-2v8l-4-2v2H5V8h12z" />,
  db: (c?: string) => <Svg className={c} d="M12 3C7.03 3 3 4.57 3 6.5S7.03 10 12 10s9-1.57 9-3.5S16.97 3 12 3zm9 6c0 1.93-4.03 3.5-9 3.5S3 10.93 3 9v3.5C3 14.43 7.03 16 12 16s9-1.57 9-3.5V9zm0 6c0 1.93-4.03 3.5-9 3.5S3 16.93 3 15v3.5C3 20.43 7.03 22 12 22s9-1.57 9-3.5V15z" />,
  shield: (c?: string) => <Svg className={c} d="M12 2l7 4v6c0 5-3.5 9-7 10c-3.5-1-7-5-7-10V6l7-4z" />,
  stars: (c?: string) => <Svg className={c} d="M5 11l2-2l2 2l-2 2l-2-2zm12-7l1.5 3L22 8.5L19 9l-1.5 3L16 9l-3-.5L15.5 7L14 4l3 1z" />,
  pencil: (c?: string) => <Svg className={c} d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z" />,
  chart: (c?: string) => <Svg className={c} d="M3 3h2v18H3V3zm16 8h2v10h-2V11zM11 7h2v14h-2V7zM7 13h2v8H7v-8z" />,
  globe: (c?: string) => <Svg className={c} d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm0 2c2.21 0 4.21.9 5.66 2.34L12 12l-5.66-5.66A7.98 7.98 0 0 1 12 4z" />,
  tag: (c?: string) => <Svg className={c} d="M10 4l10 10l-6 6L4 10V4h6zm-2 4a2 2 0 1 0-4 0a2 2 0 0 0 4 0z" />,
  heart: (c?: string) => <Svg className={c} d="M12 21s-6.2-4.35-8.4-7.1C1.6 11.3 2 8.5 4.2 7.1C6 6 8.3 6.6 9.6 8.1L12 10.8l2.4-2.7c1.3-1.5 3.6-2.1 5.4-1c2.2 1.4 2.6 4.2.6 6.8C18.2 16.65 12 21 12 21z" />,
  check: (c?: string) => <Svg className={c} d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />,
};

/* Category icon selector */
function categoryIcon(category?: string) {
  const key = (category || "").toLowerCase();
  if (key.includes("rag") || key.includes("search")) return Icons.search;
  if (["vision", "multimodal", "image"].some(k => key.includes(k))) return Icons.eye;
  if (["code", "developer tools", "sdk"].some(k => key.includes(k))) return Icons.code;
  if (["agent", "automation", "orchestration"].some(k => key.includes(k))) return Icons.bot;
  if (["speech", "audio", "voice"].some(k => key.includes(k))) return Icons.mic;
  if (key.includes("video")) return Icons.video;
  if (["data", "embeddings", "vector db"].some(k => key.includes(k))) return Icons.db;
  if (["security", "compliance"].some(k => key.includes(k))) return Icons.shield;
  if (["writing", "content"].some(k => key.includes(k))) return Icons.pencil;
  if (key.includes("marketing")) return Icons.stars;
  if (key.includes("analytics")) return Icons.chart;
  if (key.includes("platform")) return Icons.globe;
  return Icons.globe;
}

/* ---------------- small helpers ---------------- */
function stripDark(cls: string) {
  return cls.split(" ").filter((c) => !c.startsWith("dark:")).join(" ");
}
function truncate(str?: string | string[], max = 140) {
  const s = Array.isArray(str) ? str.join(" • ") : (str || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
function kFormat(n: number | null | undefined) {
  if (n == null) return "";
  if (n < 1000) return `${n}`;
  if (n < 1000000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}m`;
}
function linkOf(tool: ToolEntry, keys: string[]) {
  for (const k of keys) {
    const v = (tool as any)?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
function isNewish(tool: ToolEntry) {
  const keys = ["added_at", "created_at", "first_seen", "release_date", "updated_at"];
  const now = Date.now();
  for (const k of keys) {
    const raw = (tool as any)?.[k];
    if (!raw) continue;
    const ts = Date.parse(raw);
    if (!Number.isNaN(ts)) {
      const days = (now - ts) / (1000 * 60 * 60 * 24);
      if (days <= 30) return true;
    }
  }
  return false;
}

/* schema-aligned helpers */
function getFromPrice(t: ToolEntry): { label: string } | null {
  if (!Array.isArray((t as any).pricing_plans)) return null;
  for (const p of (t as any).pricing_plans) {
    const v = (p as any)?.price;
    if (v === 0 || v === "0" || String(v).toLowerCase() === "free") return { label: "Free" };
    if (typeof v === "number" && !Number.isNaN(v)) {
      const cycle = (p as any)?.billing_cycle ? `/${(p as any).billing_cycle}` : "";
      const cur = (p as any)?.currency ? ` ${(p as any).currency}` : "";
      return { label: `${v}${cur}${cycle}` };
    }
    if (typeof v === "string" && v.trim()) {
      const cycle = (p as any)?.billing_cycle ? `/${(p as any).billing_cycle}` : "";
      return { label: `${v}${cycle}` };
    }
  }
  return null;
}
function screenshotUrl(site?: string | null, w = 1100) {
  if (!site) return null;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(site)}?w=${w}`;
}
function pickVideoUrl(t: ToolEntry) {
  const v =
    (typeof (t as any).official_video === "string" ? (t as any).official_video : "") ||
    (Array.isArray((t as any).tutorials_youtube) && (t as any).tutorials_youtube[0]?.url) ||
    "";
  return (typeof v === "string" ? v.trim() : "") || "";
}
function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (rating / max) * 100));
  const starPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
  const Star = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={starPath} fill="currentColor" />
    </svg>
  );
  return (
    <span className="relative inline-flex">
      <span className="flex text-gray-300"><Star /><Star /><Star /><Star /><Star /></span>
      <span className="absolute left-0 top-0 overflow-hidden text-amber-500" style={{ width: `${pct}%` }}>
        <span className="flex"><Star /><Star /><Star /><Star /><Star /></span>
      </span>
    </span>
  );
}

/* localStorage helpers */
function getStoredArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function setStoredArray(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value) } as any));
  } catch {}
}

/* ---------------- Main component ---------------- */
type ThemeMode = "auto" | "light";

export default function ToolCard({ tool }: { tool: ToolEntry }) {
  const theme = getCategoryTheme((tool as any).category);
  const CatIcon = categoryIcon((tool as any).category);

  /* Allow forcing a light card look via URL: ?cardTheme=light */
  const [mode, setMode] = useState<ThemeMode>("auto");
  useEffect(() => {
    try {
      const qp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const v = qp?.get("cardTheme");
      setMode(v === "light" ? "light" : "auto");
    } catch {}
  }, []);
  const forceLight = mode === "light";

  /* MEDIA */
  const videoUrl = useMemo(() => pickVideoUrl(tool), [tool]);
  const hasVideo = videoUrl.length > 0;
  const shot = screenshotUrl((tool as any).website_url);
  const hasShot = typeof shot === "string" && shot.length > 0;

  const [mediaTab, setMediaTab] = useState<"video" | "site">("site");
  useEffect(() => {
    if (!hasVideo && mediaTab !== "site") setMediaTab("site");
  }, [hasVideo, mediaTab]);

  /* TEXT + META */
  const [descOpen, setDescOpen] = useState(false);
  const price = getFromPrice(tool);
  const modelsCount = Array.isArray((tool as any).models) ? (tool as any).models.length : 0;
  const modelHint = useMemo(() => {
    const m = (tool as any).models?.[0];
    return m ? [m.modality, m.provider].filter(Boolean).join(" · ") : null;
  }, [(tool as any).models]);

  const sec = (tool as any).technical_information?.security ?? {};
  const hasEncryption = sec.encryption_at_rest === true || sec.encryption_in_transit === true;
  const hasCerts = Array.isArray(sec.compliance_certifications) && sec.compliance_certifications.length > 0;

  const f = (tool as any).flags ?? {};
  const flags = [
    f.is_open_source ? "Open source" : null,
    f.has_free_tier ? "Free tier" : null,
    f.has_api ? "API" : null,
    f.gdpr_ready ? "GDPR" : null,
    f.hipaa_ready ? "HIPAA" : null,
  ].filter(Boolean) as string[];

  const integrations = (tool as any).technical_information?.integrations?.length || 0;
  const sdks = (tool as any).technical_information?.sdk_languages?.length || 0;
  const kd = truncate((tool as any).key_differentiator, 120);

  const { top: topRatings, quote: reviewQuote } = getTopRatings(tool);

  const website = linkOf(tool, ["website_url", "homepage", "url"]);
  const docs = linkOf(tool as any, ["documentation_url", "docs_url", "developer_docs"]);
  const github = linkOf(tool as any, ["github_url", "repo_url"]);
  const pricingUrl = linkOf(tool as any, ["pricing_url", "plans_url"]);

  const newish = isNewish(tool);

  /* FAVORITE */
  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    setIsFav(getStoredArray("favorites").includes((tool as any).slug));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "favorites") setIsFav(getStoredArray("favorites").includes((tool as any).slug));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [(tool as any).slug]);
  function toggleFavorite() {
    const cur = getStoredArray("favorites");
    const next = cur.includes((tool as any).slug) ? cur.filter((s) => s !== (tool as any).slug) : [...cur, (tool as any).slug];
    setStoredArray("favorites", next);
    setIsFav(next.includes((tool as any).slug));
  }

  /* COMPARE (max 3) */
  const [compareSet, setCompareSet] = useState<string[]>([]);
  const selected = compareSet.includes((tool as any).slug);
  useEffect(() => {
    setCompareSet(getStoredArray("compareTools"));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "compareTools") setCompareSet(getStoredArray("compareTools"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function toggleCompare() {
    let cur = getStoredArray("compareTools");
    const exists = cur.includes((tool as any).slug);
    if (exists) {
      cur = cur.filter((s) => s !== (tool as any).slug);
    } else {
      if (cur.length >= 3) {
        alert("You can compare up to 3 tools.");
        return;
      }
      cur = [...cur, (tool as any).slug];
    }
    setStoredArray("compareTools", cur);
    setCompareSet(cur);
  }
  const compareDisabled = !selected && compareSet.length >= 3;
  // const compareHref = `/compare?tools=${encodeURIComponent(compareSet.join(","))}`; // ← removed usage

  /* Derived, light-forced classes */
  const chipCls = forceLight ? stripDark(theme.chip) : theme.chip;
  const ringHover = forceLight ? stripDark(theme.ringHover) : theme.ringHover;
  const btnSolid = forceLight ? stripDark(theme.btnSolid) + " " + stripDark(theme.btnSolidHover) : theme.btnSolid + " " + theme.btnSolidHover;
  const btnOutline = forceLight ? stripDark(theme.btnOutline) + " " + stripDark(theme.btnOutlineHover) : theme.btnOutline + " " + theme.btnOutlineHover;

  return (
    <article
      className={[
        "group mb-5 break-inside-avoid rounded-2xl border shadow-sm transition-all overflow-hidden",
        "hover:-translate-y-1 hover:shadow-lg hover:ring-2",
        ringHover,
        forceLight ? "bg-white border-gray-200" : "bg-white dark:bg-zinc-900 dark:border-zinc-800",
      ].join(" ")}
    >
      {/* Category accent bar */}
      <div className={`h-1.5 w-full ${forceLight ? stripDark(theme.accentBar) : theme.accentBar}`} />

      {/* Media */}
      {(hasVideo || hasShot) && (
        <div className={["border-b", forceLight ? "border-gray-200" : "dark:border-zinc-800"].join(" ")}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {hasVideo && (
                <button
                  type="button"
                  aria-pressed={mediaTab === "video"}
                  onClick={() => setMediaTab("video")}
                  className={`text-xs rounded-full px-2.5 py-1 border transition ${
                    mediaTab === "video"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Video
                </button>
              )}
              {hasShot && (
                <button
                  type="button"
                  aria-pressed={mediaTab === "site"}
                  onClick={() => setMediaTab("site")}
                  className={`text-xs rounded-full px-2.5 py-1 border transition ${
                    mediaTab === "site"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Site
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Compare checkbox */}
              <label className={`inline-flex items-center gap-1.5 text-xs ${forceLight ? "text-gray-700" : "text-gray-700 dark:text-zinc-200"}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={toggleCompare}
                  disabled={compareDisabled}
                  aria-label={selected ? "Remove from compare" : "Add to compare"}
                  className="h-3.5 w-3.5 accent-black disabled:opacity-50"
                  title={compareDisabled ? "You can compare up to 3 tools" : "Compare this tool"}
                />
                Compare
                <span className={`ml-1 rounded-full px-1.5 py-[1px] text-[10px] ${forceLight ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                  {compareSet.length}/3
                </span>
              </label>

              {/* Favorite toggle */}
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={isFav}
                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                className={`ml-1 inline-flex items-center justify-center rounded-full p-1.5 border text-gray-600 hover:bg-gray-50 ${forceLight ? "border-gray-200" : "border-gray-200 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <span className={isFav ? "text-rose-500" : ""}>{Icons.heart("h-4 w-4")}</span>
              </button>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className={`relative rounded-xl overflow-hidden border ${forceLight ? "border-gray-200 bg-black/5" : "bg-black/5 dark:bg-zinc-800/50 dark:border-zinc-800"}`}>
              {mediaTab === "video" && hasVideo ? (
                <YouTubeEmbed url={videoUrl} title={(tool as any).name} />
              ) : hasShot ? (
                <img
                  src={shot!}
                  alt={`${(tool as any).name} site preview`}
                  className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.01]"
                  loading="lazy"
                />
              ) : null}

              {/* Hover CTA */}
              <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-gradient-to-t from-black/40 to-black/10 group-hover:flex">
                {mediaTab === "video" && hasVideo ? (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium shadow"
                    aria-label="Open video in new tab"
                  >
                    {Icons.video("h-4 w-4")}
                    Watch video
                  </a>
                ) : hasShot ? (
                  <a
                    href={website || (tool as any).website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium shadow"
                    aria-label="Open website in new tab"
                  >
                    {Icons.globe("h-4 w-4")}
                    Visit site
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`relative h-12 w-12 rounded-lg overflow-hidden flex items-center justify-center ring-1 ${forceLight ? "bg-gray-100 ring-gray-200" : "bg-gray-100 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700"}`}>
            {newish && (
              <span className="absolute -top-1 -right-1 rounded-full bg-emerald-500 text-white text-[10px] px-1.5 py-[2px] shadow">
                New
              </span>
            )}
            {(tool as any).logo_url ? (
              <img
                src={(tool as any).logo_url}
                alt={(tool as any).name}
                className="h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <span className={`${forceLight ? "text-gray-500" : "text-gray-500 dark:text-zinc-300"} text-xs font-semibold`}>
                {(tool as any).name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className={`font-semibold tracking-tight text-[15px] sm:text-base leading-snug ${forceLight ? "text-gray-900" : "text-gray-900 dark:text-zinc-100"}`}>
                {(tool as any).name}
              </h2>
              {(tool as any).category ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] ${chipCls}`}
                  title={(tool as any).category}
                >
                  {categoryIcon((tool as any).category)("h-3.5 w-3.5")}
                  {(tool as any).category}
                </span>
              ) : null}
            </div>

            {(tool as any).description && (
              <div className="mt-1">
                <p
                  className={[
                    "text-[13.5px] leading-[1.45] hyphens-auto",
                    forceLight ? "text-gray-700" : "text-gray-700 dark:text-zinc-300",
                    descOpen ? "" : "line-clamp-2 group-hover:line-clamp-3",
                  ].join(" ")}
                >
                  {(tool as any).description}
                </p>
                {String((tool as any).description).length > 180 && (
                  <button
                    type="button"
                    className={`mt-1 text-xs underline decoration-dotted underline-offset-2 ${forceLight ? "text-gray-600 hover:text-gray-900" : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                    onClick={() => setDescOpen((v) => !v)}
                    aria-expanded={descOpen}
                  >
                    {descOpen ? "Less" : "More"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Differentiator */}
        {kd && (
          <div className="mt-3">
            <p className={`text-[13px] ${forceLight ? "text-gray-600" : "text-gray-600 dark:text-zinc-400"}`}>
              <span className={`font-medium ${forceLight ? "text-gray-800" : "text-gray-800 dark:text-zinc-200"}`}>Why it’s different — </span>
              <em>{kd}</em>
            </p>
          </div>
        )}

        {/* Ratings + quote */}
        {topRatings.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {topRatings.map((r, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-[13px] ${forceLight ? "text-gray-800" : "text-gray-800 dark:text-zinc-200"}`}>
                  <Stars rating={r.rating} max={r.max} />
                  <span className="font-medium">{r.rating}/{r.max}</span>
                  {r.count != null && <span className={`${forceLight ? "text-gray-500" : "text-gray-500 dark:text-zinc-400"}`}>({kFormat(r.count)})</span>}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className={`${forceLight ? "text-gray-600" : "text-gray-600 dark:text-zinc-400"} underline`}>
                      · {r.source}
                    </a>
                  ) : (
                    <span className={`${forceLight ? "text-gray-600" : "text-gray-600 dark:text-zinc-400"}`}>· {r.source}</span>
                  )}
                </div>
              ))}
            </div>
            {reviewQuote && (
              <blockquote className={`mt-2 rounded-lg border px-3 py-2 text-[13px] italic ${forceLight ? "bg-gray-50 text-gray-700 border-gray-200" : "bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"}`}>
                “{truncate(reviewQuote, 180)}”
              </blockquote>
            )}
          </div>
        )}

        {/* Meta pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {price && (
            <span title="Starting price">
              <Pill className={`bg-amber-50 text-amber-800 border-amber-200 ${forceLight ? "" : "dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800"}`}>
                From {price.label}
              </Pill>
            </span>
          )}

          {modelsCount > 0 && (
            <span title="Declared models">
              <Pill className={`bg-indigo-50 text-indigo-700 border-indigo-200 ${forceLight ? "" : "dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"}`}>
                {modelsCount} {modelsCount === 1 ? "model" : "models"}{modelHint ? ` — ${modelHint}` : ""}
              </Pill>
            </span>
          )}

          {integrations > 0 && (
            <span title="Available integrations">
              <Pill className={`bg-blue-50 text-blue-700 border-blue-200 ${forceLight ? "" : "dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"}`}>
                {integrations} integrations
              </Pill>
            </span>
          )}

          {sdks > 0 && (
            <span title="SDK languages">
              <Pill className={forceLight ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"}>
                {sdks} SDKs
              </Pill>
            </span>
          )}

          {hasEncryption && (
            <span title="Encryption in transit or at rest">
              <Pill className={`bg-emerald-50 text-emerald-700 border-emerald-200 ${forceLight ? "" : "dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"}`}>
                Encryption
              </Pill>
            </span>
          )}

          {hasCerts && (
            <span title="Compliance certifications">
              <Pill className={`bg-teal-50 text-teal-700 border-teal-200 ${forceLight ? "" : "dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800"}`}>
                Compliance
              </Pill>
            </span>
          )}

          {(tool as any).flags && Object.values((tool as any).flags).some(Boolean) &&
            ([
              f.is_open_source ? "Open source" : null,
              f.has_free_tier ? "Free tier" : null,
              f.has_api ? "API" : null,
              f.gdpr_ready ? "GDPR" : null,
              f.hipaa_ready ? "HIPAA" : null,
            ].filter(Boolean) as string[]).map((label, i) => (
              <span key={i} title={`Flag: ${label}`}>
                <Pill className={forceLight ? "bg-gray-50 text-gray-700" : "bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"}>{label}</Pill>
              </span>
            ))
          }
        </div>

        {/* Killer feature */}
        {Array.isArray((tool as any).pros) && (tool as any).pros.length > 0 && (
          <ul className={forceLight ? "mt-3 text-[13px] text-gray-700 list-disc pl-5" : "mt-3 text-[13px] text-gray-700 list-disc pl-5 dark:text-zinc-300"}>
            <li className={forceLight ? "marker:text-gray-400" : "marker:text-gray-400 dark:marker:text-zinc-500"}>{(tool as any).pros[0]}</li>
          </ul>
        )}

        {/* Best for */}
        {Array.isArray((tool as any).best_for) && (tool as any).best_for.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(tool as any).best_for.slice(0, 4).map((bf: string, i: number) => (
              <span key={i} title="Best for">
                <Pill className={forceLight ? "bg-gray-50 text-gray-700" : "bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"}>{bf}</Pill>
              </span>
            ))}
          </div>
        )}

        {/* Quick links */}
        {(docs || github || pricingUrl) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            {docs && (
              <a
                href={docs}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${btnOutline}`}
                aria-label="Open documentation"
                title="Documentation"
              >
                <Svg d="M4 4h12a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v11a3 3 0 0 1 2-1h11V6H4zm2 2h7v2H6V8z" className="h-3.5 w-3.5" />
                Docs
              </a>
            )}
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${btnOutline}`}
                aria-label="Open GitHub"
                title="GitHub"
              >
                {Icons.code("h-3.5 w-3.5")}
                GitHub
              </a>
            )}
            {pricingUrl && (
              <a
                href={pricingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${btnOutline}`}
                aria-label="Open pricing"
                title="Pricing"
              >
                {Icons.tag("h-3.5 w-3.5")}
                Pricing
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/tools/${(tool as any).slug}`}
            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${btnSolid}`}
          >
            View details
          </Link>

          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm ${btnOutline}`}
            >
              Visit website
            </a>
          )}

          {/* NOTE: Removed per-card "Open compare" link — use the sticky Compare Tray instead */}
        </div>
      </div>
    </article>
  );
}

/* ---------------- ratings extractor ---------------- */
function getTopRatings(t: ToolEntry) {
  const ratings = Array.isArray((t as any).reviews_and_ratings) ? (t as any).reviews_and_ratings : [];
  const normalized = ratings
    .map((r: any) => {
      const rating = Number(r.rating ?? r.score ?? r.value ?? NaN);
      const max = Number(r.max ?? 5);
      const source = String(r.source || r.platform || r.site || "").trim() || "Rating";
      const url = typeof r.url === "string" ? r.url : undefined;
      const count = Number.isFinite(r.count) ? Number(r.count) : undefined;
      return Number.isFinite(rating) ? { rating, max, source, url, count } : null;
    })
    .filter(Boolean) as Array<{ rating: number; max: number; source: string; url?: string; count?: number }>;
  const top = normalized.slice(0, 3);
  const quote = (Array.isArray((t as any).reviews) && (t as any).reviews[0]?.quote) || undefined;
  return { top, quote };
}
