// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

/* -----------------------------------------------------------
   Inline icons
----------------------------------------------------------- */
const Svg = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);

const Icons = {
  home: "M12 3l9 7h-3v9H6v-9H3l9-7z",
  compare: "M7 3h2v18H7V3zm8 4h2v14h-2V7z",
  fav: "M12 21s-6.2-4.35-8.4-7.1C1.6 11.3 2 8.5 4.2 7.1C6 6 8.3 6.6 9.6 8.1L12 10.8l2.4-2.7c1.3-1.5 3.6-2.1 5.4-1c2.2 1.4 2.6 4.2.6 6.8C18.2 16.65 12 21 12 21z",
  plus: "M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2h5z",
  globe: "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm-1 2.1A7.98 7.98 0 0 0 4 12h7V4.1zM13 4.1V12h7a8 8 0 0 0-7-7.9zM4 14a8 8 0 0 0 7 7.9V14H4zm9 0v7.9A8 8 0 0 0 20 14h-7z",
  user: "M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z",
  search: "M15.5 14h-.7l-.3-.3A6 6 0 1 0 14 15.5l.3.3v.7l4.3 4.3 1.4-1.4L15.5 14z",
};

/* -----------------------------------------------------------
   Small helpers
----------------------------------------------------------- */
function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

/** Icon colors (light/dark aware). */
function iconColor(kind: string, isDark: boolean) {
  const map: Record<string, { light: string; dark: string }> = {
    home: { light: "text-emerald-600", dark: "text-emerald-400" },
    compare: { light: "text-violet-600", dark: "text-violet-400" },
    news: { light: "text-amber-600", dark: "text-amber-400" },
    favorites: { light: "text-rose-600", dark: "text-rose-400" },
    submit: { light: "text-teal-600", dark: "text-teal-400" },
    search: { light: "text-blue-600", dark: "text-blue-400" },
    lang: { light: "text-orange-600", dark: "text-orange-400" },
    signin: { light: "text-indigo-600", dark: "text-indigo-400" },
  };
  const picked = map[kind] || map.home;
  return isDark ? picked.dark : picked.light;
}

/** Read global theme from <html>.classList (set by layout no-flash script). */
function useIsDark() {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const get = () => root.classList.contains("dark");
    setIsDark(get());

    const obs = new MutationObserver(() => setIsDark(get()));
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => setIsDark(get());
    m?.addEventListener?.("change", onChange);

    return () => {
      obs.disconnect();
      m?.removeEventListener?.("change", onChange);
    };
  }, []);

  return isDark;
}

/** Text color tokens bound to theme. */
function textCls(isDark: boolean) {
  return {
    brand: isDark ? "text-zinc-100" : "text-gray-900",
    link: isDark ? "text-zinc-300" : "text-gray-700",
    linkHoverText: isDark ? "hover:text-zinc-100" : "hover:text-gray-900",
    linkHoverBg: isDark ? "hover:bg-zinc-900" : "hover:bg-gray-100",
    menuBorder: isDark ? "border-zinc-800" : "border-gray-200",
    menuBg: isDark ? "bg-zinc-950" : "bg-white",
    menuItemActive: isDark ? "bg-zinc-100 text-zinc-900" : "bg-gray-900 text-white",
  };
}

/* Language list */
const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "id", label: "ID" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
];

/* Logo paths from env (light required, dark optional) */
const LIGHT_LOGO = process.env.NEXT_PUBLIC_LOGO_LIGHT || "/brand/findailist-logo-ng.svg";
const DARK_LOGO = process.env.NEXT_PUBLIC_LOGO_DARK || LIGHT_LOGO;

export default function SiteHeader() {
  const isDark = useIsDark();
  const t = textCls(isDark);

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

  // Pick logo by theme with safe fallback
  const desiredLogo = isDark ? DARK_LOGO : LIGHT_LOGO;
  const [logoSrc, setLogoSrc] = useState<string>(desiredLogo);
  const [failedOnce, setFailedOnce] = useState(false);

  useEffect(() => {
    setLogoSrc(isDark ? DARK_LOGO : LIGHT_LOGO);
    setFailedOnce(false);
  }, [isDark]);

  const headerFrame = isDark
    ? "border-b border-zinc-800 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60"
    : "border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60";

  const linkBase =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition";

  const linkTone = `${t.link} ${t.linkHoverBg} ${t.linkHoverText}`;

  return (
    <header className={headerFrame}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + primary nav */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={cx("inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-90", t.brand)}
            aria-label="AI Tools Directory — Home"
          >
            <Image
              src={logoSrc}
              alt="Find AI List logo"
              width={20}
              height={20}
              priority
              className="h-5 w-5"
              onError={() => {
                if (!failedOnce && logoSrc !== LIGHT_LOGO) {
                  setFailedOnce(true);
                  setLogoSrc(LIGHT_LOGO);
                }
              }}
            />
            <span className="small-caps">find Ai list</span>
          </Link>

          <nav className="ml-3 hidden items-center gap-1 sm:flex">
            <Link href="/" className={cx(linkBase, linkTone)} title="Home">
              <Svg d={Icons.home} className={cx(iconColor("home", isDark), "h-4 w-4")} />
              <span className="hidden md:inline">Home</span>
            </Link>

            <Link href="/compare" className={cx(linkBase, linkTone)} title="Compare">
              <Svg d={Icons.compare} className={cx(iconColor("compare", isDark), "h-4 w-4")} />
              <span className="hidden md:inline">Compare</span>
            </Link>

            <Link href="/ai-news" className={cx(linkBase, linkTone)} title="AI News">
              <Svg d={Icons.globe} className={cx(iconColor("news", isDark), "h-4 w-4")} />
              <span className="hidden md:inline">AI News</span>
            </Link>

            <Link href="/?favorites=1" className={cx(linkBase, linkTone)} title="Favorites">
              <Svg d={Icons.fav} className={cx(iconColor("favorites", isDark), "h-4 w-4")} />
              <span className="hidden md:inline">Favorites</span>
            </Link>

            <Link href="/submit" className={cx(linkBase, linkTone)} title="Submit / Edit">
              <Svg d={Icons.plus} className={cx(iconColor("submit", isDark), "h-4 w-4")} />
              <span className="hidden md:inline">Submit</span>
            </Link>
          </nav>
        </div>

        {/* Right: Search + language + sign-in */}
        <div className="flex items-center gap-2">
          <Link href="/#tool-search" className={cx(linkBase, linkTone)} title="Search">
            <Svg d={Icons.search} className={cx(iconColor("search", isDark), "h-4 w-4")} />
            <span className="hidden md:inline">Search</span>
          </Link>

          {/* Language */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cx(linkBase, linkTone)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              title="Change language"
            >
              <Svg d={Icons.globe} className={cx(iconColor("lang", isDark), "h-4 w-4")} />
              <span className="text-xs font-medium">{lang.toUpperCase()}</span>
            </button>

            {menuOpen && (
              <ul
                role="listbox"
                className={cx(
                  "absolute right-0 z-50 mt-1 w-28 overflow-hidden rounded-lg border p-1 text-sm shadow",
                  t.menuBorder,
                  t.menuBg
                )}
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
                      className={cx(
                        "w-full rounded-md px-2 py-1 text-left",
                        lang === l.code ? t.menuItemActive : "hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sign-in */}
          <Link href="/auth" className={cx(linkBase, linkTone)} title="Sign in">
            <Svg d={Icons.user} className={cx(iconColor("signin", isDark), "h-4 w-4")} />
            <span className="hidden md:inline">Sign in</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
