// components/CompareStatus.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "compare_ids";

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("compare:change"));
}

export default function CompareStatus() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readIds());
    sync();
    const handler = () => sync();
    window.addEventListener("storage", handler);
    window.addEventListener("compare:change", handler as any);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("compare:change", handler as any);
    };
  }, []);

  const query = ids.length ? encodeURIComponent(ids.slice(0, 3).join(",")) : "";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-zinc-50 p-3 text-sm">
      <div>
        Compare selection: <strong>{ids.length}</strong> / 3
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={ids.length ? `/compare?ids=${query}` : "/compare"}
          className={`rounded-md px-3 py-1.5 ${
            ids.length
              ? "bg-black text-white hover:bg-zinc-800"
              : "bg-zinc-200 text-zinc-600 cursor-not-allowed"
          }`}
          aria-disabled={ids.length === 0}
        >
          Open Compare
        </Link>
        <button
          onClick={() => writeIds([])}
          className="rounded-md border px-3 py-1.5 hover:bg-white"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
