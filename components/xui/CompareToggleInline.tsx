"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "compare_list_v1";

function getCompareList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}
function setCompareList(arr: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(arr))));
    window.dispatchEvent(new CustomEvent("compare:list:changed"));
  } catch {}
}

function PlusIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CompareToggleInline({ slug }: { slug: string }) {
  const [mounted, setMounted] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setAdded(getCompareList().includes(slug));
    sync();
    window.addEventListener("compare:list:changed", sync);
    return () => window.removeEventListener("compare:list:changed", sync);
  }, [mounted, slug]);

  if (!mounted) return null; // avoid SSR/CSR mismatch

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cur = getCompareList();
    if (cur.includes(slug)) {
      setCompareList(cur.filter((x) => x !== slug));
      setAdded(false);
    } else {
      setCompareList([...cur, slug]);
      setAdded(true);
    }
  };

  return (
    <button
      aria-label={added ? "Remove from compare" : "Add to compare"}
      title={added ? "Remove from compare" : "Add to compare"}
      onClick={onClick}
      className={[
        "absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center",
        "rounded-full border text-gray-700",
        added ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 hover:bg-gray-50",
        "shadow-sm transition focus:outline-none focus:ring-2 focus:ring-black/20",
      ].join(" ")}
    >
      {added ? <CheckIcon /> : <PlusIcon />}
    </button>
  );
}
