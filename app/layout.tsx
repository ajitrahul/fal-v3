// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const THEME_MODE = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();
// If you want to *force* light, set NEXT_PUBLIC_TOOLCARD_THEME=light
const forceLight = THEME_MODE === "light";

export const metadata: Metadata = {
  title: "AI Tools Directory",
  description: "Discover AI tools, LLMs, and AI models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" /* For Tailwind 'dark:' variants we only enable dark via components; not forcing here */>
      <body
        className={
          forceLight
            ? "bg-white text-gray-900"
            : // allow components to use dark: classes when site uses dark scheme
              "bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-100"
        }
      >
        <SiteHeader />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
