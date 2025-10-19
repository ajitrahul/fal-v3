"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ComparePicker from "@/components/ComparePicker.client";

type ToolLite = { slug: string; name?: string | null; aliases?: string[] | null };

const QS_KEY = "slugs";
const LIMIT = 3;

function parseSlugs(raw: string | null): string[] {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // dedupe case-insensitively, keep first occurrence
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out.slice(0, LIMIT);
}

export default function ComparePickerUrl(props: { all?: ToolLite[] }) {
  const { all } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected = useMemo(
    () => parseSlugs(searchParams?.get(QS_KEY) ?? null),
    [searchParams],
  );
  const selectedSafe = Array.isArray(selected) ? selected : [];

  const buildHref = (next: string[]) => {
    // Keep raw commas; avoid URLSearchParams so commas aren’t encoded to %2C
    return `${pathname}?${QS_KEY}=${next.join(",")}`;
  };

  const resolveHref = (slug: string): string | null => {
    // Allow aliases; dedupe case-insensitively
    const lower = selectedSafe.map((s) => s.toLowerCase());
    if (lower.includes(slug.toLowerCase())) return null;
    const next = [...selectedSafe, slug];

    // dedupe again & cap at LIMIT
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const s of next) {
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(s);
      }
      if (uniq.length >= LIMIT) break;
    }
    return buildHref(uniq);
  };

  const onAdd = (slug: string) => {
    const lower = selectedSafe.map((s) => s.toLowerCase());
    if (lower.includes(slug.toLowerCase())) return;
    const next = [...selectedSafe, slug];

    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const s of next) {
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(s);
      }
      if (uniq.length >= LIMIT) break;
    }
    router.replace(buildHref(uniq), { scroll: false });
  };

  return (
    <div className="mb-4">
      <ComparePicker
        selected={selectedSafe}
        resolveHref={resolveHref}
        onAdd={onAdd}
        all={all}
      />
      {selectedSafe.length < 2 ? (
        <p className="mt-2 text-xs text-gray-500">
          Tip: add {selectedSafe.length === 0 ? "two" : "one more"} tool to start comparing (max {LIMIT}).
        </p>
      ) : null}
    </div>
  );
}
