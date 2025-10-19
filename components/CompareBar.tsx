"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "compare:list";

function readList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default function CompareBar() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    // initial read
    setSlugs(readList());

    // sync with toggles
    const onChanged = () => setSlugs(readList());
    window.addEventListener("compare:list:changed", onChanged);

    // multi-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSlugs(readList());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("compare:list:changed", onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (slugs.length === 0) return null;

  const href = useMemo(() => {
    const q = new URLSearchParams({ slugs: slugs.join(",") }).toString();
    return `/compare?${q}`;
  }, [slugs]);

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="rounded-full border bg-white shadow-md px-3 py-2 flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Selected: <strong>{slugs.join(", ")}</strong>
        </span>
        <Link
          href={href}
          prefetch
          className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-white text-sm hover:bg-gray-800"
        >
          Compare ({slugs.length})
        </Link>
      </div>
    </div>
  );
}
