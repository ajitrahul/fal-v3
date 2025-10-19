"use client";

import { useEffect, useMemo, useState } from "react";

/** Back-compat: support both keys so other components don’t need edits */
const STORAGE_KEYS = ["compare:list", "compare_list_v1"] as const;
const EVT = "compare:list:changed";
/** Change this if your route is /tools/compare */
const COMPARE_PATH = "/tools/compare";

function readList(): string[] {
  try {
    const all: string[] = [];
    for (const k of STORAGE_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) all.push(...arr.filter(Boolean));
    }
    return Array.from(new Set(all));
  } catch {
    return [];
  }
}

function clearList() {
  try {
    for (const k of STORAGE_KEYS) localStorage.removeItem(k);
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export default function CompareBar() {
  const [mounted, setMounted] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setSlugs(readList());
    sync();

    window.addEventListener(EVT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key && (STORAGE_KEYS as readonly string[]).includes(e.key)) sync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [mounted]);

  if (!mounted || slugs.length === 0) return null;

  const href = useMemo(() => {
    const q = new URLSearchParams({ slugs: slugs.join(",") }).toString();
    return `${COMPARE_PATH}?${q}`;
  }, [slugs]);

  const onCompareClick = () => {
    // clear after the browser starts navigation so querystring persists
    setTimeout(() => clearList(), 0);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="rounded-full border bg-white shadow-md px-3 py-2 flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Selected: <strong>{slugs.join(", ")}</strong>
        </span>
        <a
          href={href}
          onClick={onCompareClick}
          className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-white text-sm hover:bg-gray-800"
        >
          Compare ({slugs.length})
        </a>
        <button
          onClick={() => clearList()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
