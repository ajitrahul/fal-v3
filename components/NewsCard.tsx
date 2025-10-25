// components/NewsCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- helpers ---------- */
function useQueryParam(key: string): string | null {
  const [val, setVal] = useState<string | null>(null);
  useEffect(() => {
    try {
      setVal(new URLSearchParams(window.location.search).get(key));
    } catch {}
  }, [key]);
  return val;
}

function ellipsize(s: string, max = 60) {
  if (!s) return s;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function Highlight({ text, query }: { text: string; query?: string | null }) {
  const parts = useMemo(() => {
    const q = (query || "").trim();
    if (!q) return [text];
    try {
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})`, "ig");
      return text.split(re);
    } catch {
      return [text];
    }
  }, [text, query]);

  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded px-0.5 bg-yellow-200/60 dark:bg-yellow-300/30">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function formatAbs(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
function formatRel(iso?: string) {
  if (!iso) return "unknown";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";
  const diff = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function faviconOf(link: string) {
  const host = hostOf(link);
  return host ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}` : "";
}

/* Paywall detection (expandable) */
const PAYWALL_HOSTS = new Set([
  "wsj.com",
  "ft.com",
  "bloomberg.com",
  "theinformation.com",
  "economist.com",
]);
function isPaywalled(link: string): boolean {
  const h = hostOf(link);
  if (!h) return false;
  return Array.from(PAYWALL_HOSTS).some((p) => h === p || h.endsWith(`.${p}`));
}

/* Simple in-view hook to lazily fetch summary */
function useInView<T extends HTMLElement>(margin = "200px"): [React.RefObject<T>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: margin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen];
}

/* ---------- tiny inline icons ---------- */
function IconShare(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className || "h-4 w-4"} aria-hidden="true">
      <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a3 3 0 0 0 .06.59l-7 4.11a3 3 0 1 0 0 4.6l7.1 4.16c-.04.18-.06.36-.06.54a3 3 0 1 0 3-3z" />
    </svg>
  );
}
function IconCopy(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className || "h-4 w-4"} aria-hidden="true">
      <path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}
function IconLock(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className || "h-3.5 w-3.5"} aria-hidden="true">
      <path fill="currentColor" d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3Z" />
    </svg>
  );
}

/* ---------- component ---------- */
export default function NewsCard(props: {
  id?: string;
  title: string;
  link: string;
  isoDate?: string;
  source?: string;
}) {
  const { title, link, isoDate, source } = props;

  const q = useQueryParam("q");
  const [visited, setVisited] = useState(false);
  const [copied, setCopied] = useState(false);

  // summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumError, setSumError] = useState<string | null>(null);
  const [rootRef, inView] = useInView<HTMLDivElement>("300px");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("newsVisited");
      const vis = Array.isArray(raw ? JSON.parse(raw) : []) ? JSON.parse(raw) : [];
      setVisited(vis.includes(link));
    } catch {}
  }, [link]);

  function markVisited() {
    try {
      const raw = localStorage.getItem("newsVisited");
      const arr = Array.isArray(raw ? JSON.parse(raw) : []) ? JSON.parse(raw) : [];
      if (!arr.includes(link)) localStorage.setItem("newsVisited", JSON.stringify([...arr, link]));
      setVisited(true);
    } catch {}
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  // lazily fetch summary once visible
  useEffect(() => {
    let aborted = false;
    async function go() {
      if (sumLoading || summary || sumError) return;
      setSumLoading(true);
      try {
        const r = await fetch(
          `/api/news/summary?url=${encodeURIComponent(link)}&title=${encodeURIComponent(title)}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (!aborted) {
          if (j?.text) setSummary(j.text);
          else setSumError(j?.error || "No summary");
        }
      } catch (e: any) {
        if (!aborted) setSumError(String(e?.message || e));
      } finally {
        if (!aborted) setSumLoading(false);
      }
    }
    if (inView) go();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, link, title]);

  const abs = formatAbs(isoDate);
  const rel = formatRel(isoDate);
  const host = hostOf(link);
  const faviconUrl = faviconOf(link);
  const paywalled = isPaywalled(link);

  const shareX = useMemo(
    () => `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`,
    [link, title]
  );
  const shareLI = useMemo(
    () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    [link]
  );

  return (
    <article
      ref={rootRef}
      className="rounded-lg border border-gray-200 bg-white p-2 transition hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      {/* Row 1: title */}
      <h3
        className={[
          "text-[14px] leading-snug",
          visited ? "text-gray-700 dark:text-zinc-300" : "text-gray-900 dark:text-zinc-100",
        ].join(" ")}
        title={title}
      >
        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={markVisited}>
          <Highlight text={ellipsize(title, 60)} query={q} />
        </a>
      </h3>

      {/* Row 1.5: summary (optional) */}
      {summary ? (
        <p className="mt-2 text-[12px] leading-snug text-gray-700 dark:text-zinc-300">{summary}</p>
      ) : sumLoading ? (
        <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
      ) : null}

      {/* Row 2: source + time + badges + share */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="h-3.5 w-3.5 rounded-sm ring-1 ring-gray-200 dark:ring-zinc-700"
              loading="lazy"
            />
          ) : null}
          <span className="truncate text-[11px] text-gray-600 dark:text-zinc-400" title={source || host || "Source"}>
            {source || host || "Source"}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-zinc-500 tabular-nums" title={abs}>
            · {rel}
          </span>
          {paywalled && (
            <span
              title="Likely paywalled source"
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-[1px] text-[10px] font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
            >
              <IconLock className="h-3 w-3" />
              Paywalled
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={copyLink}
            title={copied ? "Copied!" : "Copy link"}
          >
            <IconCopy className="h-3.5 w-3.5" />
          </button>
          <a
            href={shareX}
            target="_blank"
            rel="noopener noreferrer"
            title="Share on X"
            className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <IconShare className="h-3.5 w-3.5" />
          </a>
          <a
            href={shareLI}
            target="_blank"
            rel="noopener noreferrer"
            title="Share on LinkedIn"
            className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            in
          </a>
        </div>
      </div>
    </article>
  );
}
