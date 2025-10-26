// components/SortSelect.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest", value: "newest" },
  { label: "Top rated", value: "top_rated" },
  { label: "Free first", value: "free_first" },
];

export default function SortSelect() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = sp.get("sort") || "relevance";

  return (
    <select
      className="rounded-md border px-2 py-2 text-sm"
      value={value}
      onChange={(e) => {
        const u = new URL(window.location.href);
        u.searchParams.set("sort", e.target.value);
        router.push(`${pathname}?${u.searchParams.toString()}`, { scroll: false });
      }}
      aria-label="Sort tools"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
