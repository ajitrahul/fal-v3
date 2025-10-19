// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AI Tools Directory",
  description: "Browse And Compare AI Tools, Models, And Platforms.",
};

const THEME_MODE = process.env.NEXT_PUBLIC_TOOLCARD_THEME ?? "auto";

const initThemeScript = `
(function() {
  var mode = ${JSON.stringify(THEME_MODE)};
  var root = document.documentElement;
  try {
    if (mode === "dark") { root.classList.add("dark"); return; }
    if (mode === "light") { root.classList.remove("dark"); return; }
    var saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      root.classList.toggle("dark", saved === "dark");
      return;
    }
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: initThemeScript }} />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded bg-gray-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Skip to content
        </a>

        <SiteHeader />

        <div id="content">{children}</div>

        <SiteFooter />
      </body>
    </html>
  );
}
