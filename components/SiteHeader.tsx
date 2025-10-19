// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const Svg = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);

const Icons = {
  logo: "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm1 5v5.6l3.3 3.3l-1.4 1.4L11 13V7h2z",
  home: "M12 3l9 7h-3v9H6v-9H3l9-7z",
  compare: "M7 3h2v18H7V3zm8 4h2v14h-2V7z",
  fav: "M12 21s-6.2-4.35-8.4-7.1C1.6 11.3 2 8.5 4.2 7.1C6 6 8.3 6.6 9.6 8.1L12 10.8l2.4-2.7c1.3-1.5 3.6-2.1 5.4-1c2.2 1.4 2.6 4.2.6 6.8C18.2 16.65 12 21 12 21z",
  plus: "M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2h5z",
  globe: "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm-1 2.1A7.98 7.98 0 0 0 4 12h7V4.1zM13 4.1V12h7a8 8 0 0 0-7-7.9zM4 14a8 8 0 0 0 7 7.9V14H4zm9 0v7.9A8 8 0 0 0 20 14h-7z",
  user: "M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z",
  search: "M15.5 14h-.7l-.3-.3A6 6 0 1 0 14 15.5l.3.3v.7l4.3 4.3 1.4-1.4L15.5 14z",
};

const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "id", label: "ID" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
];

export default function SiteHeader() {
  const [lang, setLang] = useState<string>("en");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const urlLang = new URLSearchParams(window.location.search).get("lang");
      const saved = localStorage.getItem("lang");
      setLang((urlLang || saved || "en").toLowerCase());
    } catch {}
  }, []);

  function applyLang(next: string) {
    try {
      setLang(next);
      localStorage.setItem("lang", next);
      const sp = new URLSearchParams(window.location.search);
      sp.set("lang", next);
      const to = window.location.pathname + "?" + sp.toString();
      window.history.replaceState(null, "", to);
    } catch {}
  }

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + quick nav */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900 hover:opacity-90 dark:text-zinc-100"
            aria-label="AI Tools Directory — Home"
          >
            <Svg d={Icons.logo} className="h-5 w-5" />
            <span className="small-caps">ai tools directory</span>
          </Link>

          <nav className="ml-3 hidden items-center gap-1 text-sm sm:flex">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              title="Home"
            >
              <Svg d={Icons.home} className="h-4 w-4" />
              <span className="hidden md:inline">Home</span>
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              title="Compare"
            >
              <Svg d={Icons.compare} className="h-4 w-4" />
              <span className="hidden md:inline">Compare</span>
            </Link>
            <Link
              href="/?favorites=1"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              title="Favorites"
            >
              <Svg d={Icons.fav} className="h-4 w-4" />
              <span className="hidden md:inline">Favorites</span>
            </Link>
            <Link
              href="/submit"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              title="Submit / Edit"
            >
              <Svg d={Icons.plus} className="h-4 w-4" />
              <span className="hidden md:inline">Submit</span>
            </Link>
          </nav>
        </div>

        {/* Right: Search + language + account */}
        <div className="flex items-center gap-2">
          <Link
            href="/#tool-search"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            title="Search"
          >
            <Svg d={Icons.search} className="h-4 w-4" />
            <span className="hidden md:inline">Search</span>
          </Link>

          {/* Language */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              title="Change language"
            >
              <Svg d={Icons.globe} className="h-4 w-4" />
              <span className="text-xs font-medium">{lang.toUpperCase()}</span>
            </button>
            {menuOpen && (
              <ul
                role="listbox"
                className="absolute right-0 z-50 mt-1 w-28 overflow-hidden rounded-lg border bg-white p-1 text-sm shadow dark:border-zinc-800 dark:bg-zinc-950"
              >
                {LANGS.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={lang === l.code}
                      onClick={() => {
                        applyLang(l.code);
                        setMenuOpen(false);
                      }}
                      className={`w-full rounded-md px-2 py-1 text-left ${
                        lang === l.code
                          ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "hover:bg-gray-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sign-in (placeholder link) */}
          <Link
            href="/auth"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            title="Sign in"
          >
            <Svg d={Icons.user} className="h-4 w-4" />
            <span className="hidden md:inline">Sign in</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
