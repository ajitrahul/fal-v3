// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Read logo from env (fallback to your public asset)
const LOGO_SRC =
  process.env.NEXT_PUBLIC_LOGO_SRC ||
  "/brand/findailist-logo.svg";

// Control whether the theme toggle is visible in the header
const SHOW_THEME_TOGGLE =
  (process.env.NEXT_PUBLIC_SHOW_THEME_TOGGLE ?? "true").toLowerCase() !== "false";

// If you want to force "auto" site-wide, set NEXT_PUBLIC_TOOLCARD_THEME=auto in .env.local
const ENV_THEME = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();

// Submit page path (configurable)
const SUBMIT_PATH = process.env.NEXT_PUBLIC_SUBMIT_PATH || "/submit";

function ThemeToggle() {
  if (!SHOW_THEME_TOGGLE) return null;

  const [mode, setMode] = useState<string>("auto");

  useEffect(() => {
    try {
      const v = localStorage.getItem("siteTheme");
      setMode(v === "dark" || v === "light" || v === "auto" ? v : "auto");
    } catch {}
  }, []);

  const apply = (next: string) => {
    try {
      localStorage.setItem("siteTheme", next);
      setMode(next);
      const el = document.documentElement;
      const prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = next === "auto" ? prefersDark : next === "dark";
      if (dark) el.classList.add("dark");
      else el.classList.remove("dark");
      (el.style as any).colorScheme = dark ? "dark" : "light";
      window.dispatchEvent(new StorageEvent("storage", { key: "siteTheme", newValue: next } as any));
    } catch {}
  };

  return (
    <div className="flex items-center gap-1">
      <label className="sr-only">Theme</label>
      <select
        className="rounded-md border bg-white px-2 py-1 text-sm text-gray-700 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700"
        value={mode}
        onChange={(e) => apply(e.target.value)}
        title="Theme"
      >
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();

  const nav = [
    { href: "/", label: "Home" },
    { href: "/compare", label: "Compare" },
    { href: "/ai-news", label: "AI News" },
  ];

  const showEnvBadge = false;

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur dark:bg-zinc-900/70 dark:border-zinc-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Find AI List"
              className="h-6 w-auto"
            />
            <span className="font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
              Find AI List
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-3 sm:flex">
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={[
                    "rounded-md px-2 py-1 text-sm",
                    active
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  ].join(" ")}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Submit Tool — always visible (mobile & desktop) */}
          <Link
            href={SUBMIT_PATH}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
                       text-white bg-black hover:bg-gray-800
                       dark:bg-white dark:text-black dark:hover:bg-zinc-200
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white dark:focus:ring-offset-zinc-900"
            aria-label="Submit a new tool"
          >
            {/* simple plus icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
            </svg>
            Submit AI Tool
          </Link>

          {showEnvBadge && (
            <span className="hidden rounded-md border px-2 py-0.5 text-xs text-gray-600 dark:text-zinc-300 dark:border-zinc-700 sm:inline-block">
              theme={ENV_THEME}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
