// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import CompareTray from "@/components/CompareTray"; // ← add

export const metadata: Metadata = {
  title: "Find AI List",
  description: "Discover, compare, and track AI tools, LLMs and platforms.",
};

// Read the env theme once on the server for SSR class fallback
const ENV_THEME = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();
// If env forces dark, add 'dark' on the server to avoid a flash. Otherwise keep empty and let the client decide.
const ssrHtmlClass = ENV_THEME === "dark" ? "dark" : "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ssrHtmlClass} suppressHydrationWarning>
      <head>
        {/* 1) Theme bootstrap (runs before any paint). Must live in <head> */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
  try{
    var env = ${JSON.stringify(ENV_THEME)};
    var key = 'siteTheme'; // optional user override saved by your header toggle
    var forced = null;
    try { forced = localStorage.getItem(key); } catch(e){}
    var target = (forced && (forced === 'dark' || forced === 'light' || forced === 'auto')) ? forced : env;

    var prefersDark = false;
    try { prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(e){}

    var isDark = (target === 'auto') ? prefersDark : (target === 'dark');
    var el = document.documentElement;

    if (isDark) { el.classList.add('dark'); } else { el.classList.remove('dark'); }
    try { el.style.colorScheme = isDark ? 'dark' : 'light'; } catch(e){}

    // React to changes from the header toggle across tabs
    window.addEventListener('storage', function(ev){
      if (ev && ev.key === key) {
        try {
          var next = ev.newValue;
          var t = (next === 'auto' || next === 'dark' || next === 'light') ? next : env;
          var pd = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          var d = (t === 'auto') ? pd : (t === 'dark');
          if (d) el.classList.add('dark'); else el.classList.remove('dark');
          try { el.style.colorScheme = d ? 'dark' : 'light'; } catch(e){}
        } catch(e){}
      }
    });
  }catch(e){}
})();`}
        </Script>

        {/* Optional: keep the browser UI bar coherent with current theme */}
        <meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>

      <body className="min-h-screen bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
        <SiteHeader />
        <main className="min-h-[calc(100vh-56px)]">{children}</main>

        {/* Compare Tray sits at the very bottom so it can be sticky over content */}
        <CompareTray />
      </body>
    </html>
  );
}
