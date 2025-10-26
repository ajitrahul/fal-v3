// components/ThemeController.tsx
"use client";

import { useEffect, useState } from "react";

/**
 * Tiny theme controller:
 * - Reads env default from NEXT_PUBLIC_TOOLCARD_THEME (via data attr set in layout)
 * - Reads user override from localStorage('theme')
 * - Calls window.__setTheme(m) which the layout bootstrap provides
 *
 * Modes: "auto" | "light" | "dark"
 */
type Mode = "auto" | "light" | "dark";

function getInitial(): Mode {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark" || saved === "auto") return saved as Mode;
  } catch {}
  const env = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();
  return (env === "light" || env === "dark" || env === "auto") ? (env as Mode) : "auto";
}

export function ThemeToggleButton() {
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    setMode(getInitial());
  }, []);

  function apply(next: Mode) {
    setMode(next);
    try {
      // Persist user override
      localStorage.setItem("theme", next);
    } catch {}
    // Ask the layout bootstrap to apply immediately
    if (typeof window !== "undefined" && typeof (window as any).__setTheme === "function") {
      (window as any).__setTheme(next);
    } else {
      // Fallback (rare): toggle class directly
      const root = document.documentElement;
      if (next === "dark") {
        root.classList.add("dark");
        root.dataset.theme = "dark";
      } else if (next === "light") {
        root.classList.remove("dark");
        root.dataset.theme = "light";
      } else {
        const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          root.classList.add("dark"); root.dataset.theme = "dark";
        } else {
          root.classList.remove("dark"); root.dataset.theme = "light";
        }
      }
    }
  }

  const btnCls = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm transition";
  const on = "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white";
  const off = "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
      <button
        type="button"
        className={`${btnCls} ${mode === "auto" ? on : off}`}
        title="Auto theme"
        onClick={() => apply("auto")}
      >
        Auto
      </button>
      <button
        type="button"
        className={`${btnCls} ${mode === "light" ? on : off}`}
        title="Light theme"
        onClick={() => apply("light")}
      >
        Light
      </button>
      <button
        type="button"
        className={`${btnCls} ${mode === "dark" ? on : off}`}
        title="Dark theme"
        onClick={() => apply("dark")}
      >
        Dark
      </button>
    </div>
  );
}

export default ThemeToggleButton;
