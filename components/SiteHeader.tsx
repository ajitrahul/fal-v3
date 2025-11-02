// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

// Read logo from env (fallback to your public asset)
const LOGO_SRC =
  process.env.NEXT_PUBLIC_LOGO_SRC || "/brand/findailist-logo.svg";

// Control whether the theme toggle is visible in the header
const SHOW_THEME_TOGGLE =
  (process.env.NEXT_PUBLIC_SHOW_THEME_TOGGLE ?? "true").toLowerCase() !== "false";

// Env theme (auto/light/dark)
const ENV_THEME = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();

// Submit page path (configurable)
const SUBMIT_PATH = process.env.NEXT_PUBLIC_SUBMIT_PATH || "/submit";

/** Resolve login URL from env:
 * - empty → "/login"
 * - relative like "login" or "/login" → "/login"
 * - absolute "http(s)://..." → use as-is
 */
function getLoginUrl() {
  const raw = (process.env.NEXT_PUBLIC_LOGIN_URL || "").trim();
  if (!raw) return "/login";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}
const LOGIN_URL = getLoginUrl();

/**
 * Derive boolean isDark from env + document state.
 * - If env is 'dark' → true
 * - If env is 'light' → false
 * - If env is 'auto' → read <html>.classList and listen for changes
 */
function useIsDarkFromEnv() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (ENV_THEME === "dark") return true;
    if (ENV_THEME === "light") return false;
    if (typeof document !== "undefined")
      return document.documentElement.classList.contains("dark");
    return false;
  });

  useEffect(() => {
    if (ENV_THEME !== "auto") return; // env is authoritative
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    update();

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "siteTheme") update();
    };
    window.addEventListener("storage", onStorage);

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMedia = () => update();
    try {
      mql?.addEventListener?.("change", onMedia);
    } catch {
      // Safari fallback
      mql?.addListener?.(onMedia as any);
    }

    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        mql?.removeEventListener?.("change", onMedia);
      } catch {
        mql?.removeListener?.(onMedia as any);
      }
      obs.disconnect();
    };
  }, []);

  return isDark;
}

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
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = next === "auto" ? prefersDark : next === "dark";
      if (dark) el.classList.add("dark");
      else el.classList.remove("dark");
      (el.style as any).colorScheme = dark ? "dark" : "light";
      window.dispatchEvent(
        new StorageEvent("storage", { key: "siteTheme", newValue: next } as any)
      );
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
  const isDark = useIsDarkFromEnv();
  const { data: session, status } = useSession();

  const nav = [
    { href: "/", label: "Home" },
    { href: "/compare", label: "Compare" },
    { href: "/ai-news", label: "AI News" },
  ];

  // Primary (filled) button style — ensures high contrast on both themes
  const primaryBtnBase =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryBtnLight =
    "text-white bg-black hover:bg-gray-800 focus:ring-black focus:ring-offset-white";
  const primaryBtnDark =
    "text-black bg-white hover:bg-zinc-200 focus:ring-white focus:ring-offset-zinc-900";
  const primaryBtnClass = [
    primaryBtnBase,
    isDark ? primaryBtnDark : primaryBtnLight,
  ].join(" ");

  // Submit uses the same primary style for visual consistency
  const submitBtnClass = primaryBtnClass;

  // Outline style (kept for Sign out only)
  const outlineBtnBase =
    "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const outlineBtnLight =
    "text-gray-800 border-gray-300 hover:bg-gray-100 focus:ring-black focus:ring-offset-white";
  const outlineBtnDark =
    "text-zinc-100 border-zinc-700 hover:bg-zinc-800 focus:ring-white focus:ring-offset-zinc-900";
  const outlineBtnClass = [
    outlineBtnBase,
    isDark ? outlineBtnDark : outlineBtnLight,
  ].join(" ");

  const userChipClass = isDark
    ? "rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-100"
    : "rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800";

  const userLabel =
    session?.user?.name || session?.user?.email || "Account";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur dark:bg-zinc-900/70 dark:border-zinc-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="Go to home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="Find AI List" className="h-6 w-auto" />
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
          {/* Submit Tool — theme-aligned */}
          <Link href={SUBMIT_PATH} className={submitBtnClass} aria-label="Submit a new tool">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
            </svg>
            Submit AI Tool
          </Link>

          {/* Auth area: Log in (filled for clarity) or user chip + Sign out */}
          {status === "authenticated" ? (
            <div className="flex items-center gap-2">
              <span className={userChipClass} title={session?.user?.email || undefined}>
                Hi, {userLabel}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className={outlineBtnClass}
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href={LOGIN_URL} className={primaryBtnClass} aria-label="Log in">
              Logxin
            </Link>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
