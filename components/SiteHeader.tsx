// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/* ---------- helpers ---------- */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- icons (inline, no deps) ---------- */
const Svg = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);
const Icons = {
  home: (c?: string) => <Svg className={c} d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />,
  news: (c?: string) => <Svg className={c} d="M4 5h14a2 2 0 0 1 2 2v11H6a2 2 0 0 1-2-2V5zm2 3v8h12V7H6zm-2 12h16v2H4zM8 9h8v2H8V9zm0 3h8v2H8v-2z" />,
  compare: (c?: string) => <Svg className={c} d="M7 5h4v14H7V5zm6 4h4v10h-4V9zM5 3h8v2H5V3zm10 6h4V7h-4v2z" />,
  menu: (c?: string) => <Svg className={c} d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />,
  close: (c?: string) => <Svg className={c} d="M6 6l12 12M18 6L6 18" />,
};

/* ---------- config from env ---------- */
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "AI Tools Directory";
const LOGO_SRC =
  process.env.NEXT_PUBLIC_LOGO_SRC || "/brand/findailist-logo-ng.svg"; // default path in /public
const THEME_MODE = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase(); // "light" | "auto"

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // treat "light" as forced-light; otherwise allow dark styles
  const forceLight = THEME_MODE === "light";

  // close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // color classes (respect env theme)
  const baseBar = forceLight
    ? "bg-white border-b border-gray-200"
    : "bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800";

  const linkBase = forceLight
    ? "text-gray-700 hover:text-gray-900"
    : "text-gray-700 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-white";

  const badge = forceLight
    ? "text-[10px] rounded-full bg-emerald-50 text-emerald-700 px-2 py-[2px] border border-emerald-200"
    : "text-[10px] rounded-full bg-emerald-900/20 text-emerald-200 px-2 py-[2px] border border-emerald-800";

  const btn = (solid = false) =>
    forceLight
      ? solid
        ? "inline-flex items-center gap-1 rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black"
        : "inline-flex items-center gap-1 rounded-lg border border-gray-200 text-gray-700 px-3 py-1.5 text-sm hover:bg-gray-50"
      : solid
      ? "inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-sm hover:bg-black"
      : "inline-flex items-center gap-1 rounded-lg border border-zinc-700 text-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-800";

  const icon = (active = false) =>
    cx(
      "h-4 w-4",
      active
        ? forceLight
          ? "text-gray-900"
          : "text-white"
        : forceLight
        ? "text-gray-600"
        : "text-zinc-300"
    );

  const nav = [
    { href: "/", label: "Home", icon: Icons.home },
    { href: "/ai-news", label: "AI News", icon: Icons.news },
    { href: "/compare", label: "Compare", icon: Icons.compare },
  ];

  return (
    <header className={cx("w-full", baseBar)}>
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2" aria-label={SITE_NAME}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt={SITE_NAME}
                className="h-6 w-auto"
                loading="eager"
                decoding="async"
              />
              <span
                className={cx(
                  "hidden sm:inline-block font-semibold tracking-tight",
                  forceLight ? "text-gray-900" : "text-gray-900 dark:text-zinc-100"
                )}
                style={{ fontVariant: "small-caps" as any }}
              >
                {SITE_NAME}
              </span>
              <span className={badge}>Beta</span>
            </Link>
          </div>

          {/* Center: Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cx(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                    linkBase,
                    active && (forceLight ? "bg-gray-100" : "dark:bg-zinc-800")
                  )}
                >
                  {n.icon(icon(active))}
                  <span className="text-sm">{n.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Submit + Mobile menu */}
          <div className="flex items-center gap-2">
            <Link href="/submit" className={btn(false)}>
              <Svg d="M12 5v6h6v2h-6v6h-2v-6H4v-2h6V5z" className="h-4 w-4" />
              <span>Submit</span>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              className={cx(btn(false), "md:hidden px-2 py-1")}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? Icons.close("h-4 w-4") : Icons.menu("h-4 w-4")}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div
            className={cx(
              "md:hidden border-t mt-2 pt-2 pb-3",
              forceLight ? "border-gray-200" : "dark:border-zinc-800"
            )}
          >
            <nav className="flex flex-col gap-1">
              {nav.map((n) => {
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    className={cx(
                      "flex items-center gap-2 rounded-md px-2 py-2",
                      linkBase,
                      active && (forceLight ? "bg-gray-100" : "dark:bg-zinc-800")
                    )}
                  >
                    {n.icon(icon(active))}
                    <span className="text-sm">{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
