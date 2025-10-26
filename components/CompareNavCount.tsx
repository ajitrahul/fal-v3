"use client";

import { useEffect, useState } from "react";

export default function CompareNavCount() {
  const [count, setCount] = useState(0);

  function read() {
    try {
      const raw = localStorage.getItem("compareTools");
      const arr = raw ? JSON.parse(raw) : [];
      setCount(Array.isArray(arr) ? Math.min(3, arr.length) : 0);
    } catch {
      setCount(0);
    }
  }

  useEffect(() => {
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "compareTools") read();
    };
    const onVis = () => document.visibilityState === "visible" && read();
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  function scrollToTray() {
    try {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={scrollToTray}
      className="relative inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs
                 bg-white text-gray-700 border-gray-200 hover:bg-gray-50
                 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
      title="Scroll to the compare tray"
    >
      Compare
      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black px-1.5 py-[1px] text-[10px]">
        {count}/3
      </span>
    </button>
  );
}
