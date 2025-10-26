"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function SortSelect({
  current,
  q,
}: {
  current?: string;
  q?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const value = useMemo(() => (current ? current.toLowerCase() : ""), [current]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value;
      const sp = new URLSearchParams(params.toString());

      if (next) sp.set("sort", next);
      else sp.delete("sort");

      if (q) sp.set("q", q); // preserve search term if present

      const qs = sp.toString();
      router.push(`/tools${qs ? `?${qs}` : ""}`);
    },
    [params, q, router]
  );

  return (
    <select
      id="sort"
      value={value}
      onChange={onChange}
      className="rounded-md border px-2 py-1 text-sm"
      aria-label="Sort tools"
    >
      <option value="">Relevance</option>
      <option value="rating">Top rated</option>
      <option value="reviews">Most reviewed</option>
      <option value="new">Newest</option>
      <option value="name">A–Z</option>
    </select>
  );
}
