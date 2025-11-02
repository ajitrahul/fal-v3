// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import CompareTray from "@/components/CompareTray";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Find AI List",
  description: "Discover, compare, and track AI tools, LLMs and platforms.",
};

// Read the env theme once on the server for SSR class fallback
const ENV_THEME = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();
// SSR: only force dark on the server to avoid a flash; light is default otherwise
const ssrHtmlClass = ENV_THEME === "dark" ? "dark" : "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ssrHtmlClass} suppressHydrationWarning>
      <head>
        {/* Theme bootstrap (runs before any paint). Must live in <head> */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
  try{
    var env = ${JSON.stringify(ENV_THEME)};
    var key = 'siteTheme';
    var el = document.documentElement;

    function applyDark(isDark){
      try { if (isDark) el.classList.add('dark'); else el.classList.remove('dark'); } catch(e){}
      try { el.style.colorScheme = isDark ? 'dark' : 'light'; } catch(e){}
    }

    // If env is explicit light/dark, it is authoritative.
    if (env === 'light' || env === 'dark') {
      applyDark(env === 'dark');
      // Clear any stale local override so future loads are consistent with env
      try { localStorage.removeItem(key); } catch(e){}
      // Do NOT listen to storage events; env is fixed
      return;
    }

    // Otherwise env === 'auto' → allow local override (auto/dark/light) and fall back to system
    var forced = null;
    try { forced = localStorage.getItem(key); } catch(e){}
    var target = (forced === 'dark' || forced === 'light' || forced === 'auto') ? forced : 'auto';

    var prefersDark = false;
    try {
      prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch(e){}

    var isDark = (target === 'auto') ? prefersDark : (target === 'dark');
    applyDark(isDark);

    // React to changes from the header theme selector
    window.addEventListener('storage', function(ev){
      if (!ev || ev.key !== key) return;
      try {
        var next = ev.newValue;
        var t = (next === 'auto' || next === 'dark' || next === 'light') ? next : 'auto';
        var pd = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var d = (t === 'auto') ? pd : (t === 'dark');
        applyDark(d);
      } catch(e){}
    });
  }catch(e){}
})();`}
        </Script>

        <meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>

      <body className="min-h-screen bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
        {/* Auth session context for client components (e.g., header button) */}
        <Providers>
          <SiteHeader />
          <main className="min-h-[calc(100vh-56px)]">{children}</main>
          {/* Compare Tray sits at the very bottom so it can be sticky over content */}
          <CompareTray />
        </Providers>
      </body>
    </html>
  );
}
