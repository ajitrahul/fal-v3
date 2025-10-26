"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "compare_list_v1";
const MAX_COMPARE = 3;
const EVT = "compare:list:changed";

function readList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeList(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(list))));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export default function CompareToggle({
  slug,
  className = "",
}: { slug: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => setMounted(true), []);

  // Clear selection on full page reloads only (not SPA navigations)
  useEffect(() => {
    if (!mounted) return;
    const onBeforeUnload = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mounted]);

  // Keep local state in sync with storage
  useEffect(() => {
    if (!mounted) return;
    const sync = () => setSelected(readList().includes(slug));
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [mounted, slug]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = readList();
    const idx = list.indexOf(slug);

    if (idx >= 0) {
      list.splice(idx, 1);
      writeList(list);
      setSelected(false);
      return;
    }

    if (list.length >= MAX_COMPARE) {
      alert(`Only ${MAX_COMPARE} tools can be compared at a time.`);
      return;
    }

    list.push(slug);
    writeList(list);
    setSelected(true);
  };

  // Small, unobtrusive icon button (no text), top-right corner of card
  return (
    <button
      aria-label={selected ? "Remove from compare" : "Add to compare"}
      title={selected ? "Remove from compare" : "Add to compare"}
      onClick={onClick}
      className={
        "absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border bg-white/95 backdrop-blur transition hover:bg-gray-50 " +
        (selected ? "ring-2 ring-black" : "") +
        (className ? " " + className : "")
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {selected ? <path d="M5 10l3 3 7-7" /> : <path d="M10 4v12M4 10h12" />}
      </svg>
    </button>
  );
}
