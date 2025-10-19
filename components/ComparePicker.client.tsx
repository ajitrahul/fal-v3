"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ToolLite = { slug: string; name?: string | null; aliases?: string[] | null };

type Props = {
  selected?: string[];                      // may be undefined initially
  resolveHref?: (canonicalSlug: string) => string | null;
  all?: ToolLite[];                         // server-provided list (preferred)
  onAdd?: (canonicalSlug: string) => void;  // fallback
  className?: string;
};

function normalizeTools(raw: unknown): ToolLite[] {
  if (Array.isArray(raw)) {
    const out: ToolLite[] = [];
    for (const it of raw) {
      if (typeof it === "string") out.push({ slug: it });
      else if (it && typeof it === "object" && "slug" in it) {
        const o = it as any;
        const aliasesRaw = []
          .concat(o.aliases ?? [])
          .concat(o.alt_slugs ?? [])
          .concat(o.short_slug ? [o.short_slug] : [])
          .concat(o.slug_short ? [o.slug_short] : [])
          .concat(o.short ? [o.short] : [])
          .concat(o.abbrev ? [o.abbrev] : []);
        const aliases = aliasesRaw
          .filter((v: any) => typeof v === "string")
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean);
        out.push({
          slug: String(o.slug), // canonical
          name: o.name ? String(o.name) : o.title ? String(o.title) : undefined,
          aliases: aliases.length ? aliases : undefined,
        });
      }
    }
    const seen = new Set<string>();
    return out.filter((t) => (seen.has(t.slug) ? false : (seen.add(t.slug), true)));
  }
  return [];
}

export default function ComparePicker({ selected, resolveHref, all, onAdd, className }: Props) {
  const selectedSafe = Array.isArray(selected) ? selected : [];

  const [list, setList] = useState<ToolLite[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    if (all && all.length) {
      setList(normalizeTools(all));
      return () => {};
    }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/slugs", { cache: "no-store" });
        const json = await res.json().catch(() => []);
        if (!mounted) return;
        setList(normalizeTools(json));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [all]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return list
      .filter(
        (t) =>
          (t.name || "").toLowerCase().includes(term) ||
          t.slug.toLowerCase().includes(term) ||
          (t.aliases ?? []).some((a) => a.includes(term)),
      )
      .slice(0, 12);
  }, [q, list]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className={["relative", className].filter(Boolean).join(" ")}>
      <label className="mb-1 block text-sm font-medium">Add tools to compare</label>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Loading tools..." : "Type a tool name, slug, or alias"}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
          aria-label="Search tools to compare"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          aria-label="Toggle suggestions"
        >
          ▼
        </button>
      </div>

      {open && (q.trim().length > 0 || results.length > 0) && (
        <div role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No matches. Try different keywords.</div>
          ) : (
            results.map((t) => {
              const isSelected = selectedSafe.includes(t.slug);
              const href = !isSelected && resolveHref ? resolveHref(t.slug) : null;

              return href ? (
                <Link
                  key={t.slug}
                  href={href}
                  role="option"
                  aria-selected={false}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => { setOpen(false); setQ(""); }}
                >
                  <span className="font-medium">{t.name ?? t.slug}</span>
                  <span className="ml-2 text-gray-500">
                    ({t.slug}{t.aliases && t.aliases.length ? ` • aka: ${t.aliases.slice(0, 2).join(", ")}` : ""})
                  </span>
                </Link>
              ) : (
                <button
                  key={t.slug}
                  type="button"
                  disabled={isSelected}
                  onClick={() => { if (!isSelected && onAdd) onAdd(t.slug); setOpen(false); setQ(""); }}
                  className={["block w-full cursor-pointer px-3 py-2 text-left text-sm", isSelected ? "text-gray-400" : "hover:bg-gray-50"].join(" ")}
                  role="option"
                  aria-selected={false}
                >
                  <span className="font-medium">{t.name ?? t.slug}</span>
                  <span className="ml-2 text-gray-500">
                    ({t.slug}{t.aliases && t.aliases.length ? ` • aka: ${t.aliases.slice(0, 2).join(", ")}` : ""})
                  </span>
                  {isSelected ? <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs">Selected</span> : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
