// components/SearchBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SearchBar({ placeholder = "Search AI tools, tasks, categories…" }: { placeholder?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial = searchParams.get("q") || "";
  const [q, setQ] = useState(initial);

  // Debounce
  const debounced = useMemo(() => {
    let h: any;
    return (value: string) => {
      clearTimeout(h);
      h = setTimeout(() => {
        const u = new URL(window.location.href);
        if (value) u.searchParams.set("q", value);
        else u.searchParams.delete("q");
        router.push(`${pathname}?${u.searchParams.toString()}`, { scroll: false });
      }, 250);
    };
  }, [pathname, router]);

  useEffect(() => {
    setQ(initial);
  }, [initial]);

  return (
    <div className="w-full">
      <label htmlFor="global-search" className="sr-only">Search</label>
      <input
        id="global-search"
        type="search"
        className="w-full rounded-lg border px-4 py-2 text-sm"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          debounced(e.target.value);
        }}
      />
    </div>
  );
}
