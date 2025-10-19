// app/(home)/layout.tsx
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: `${SITE_NAME} — Discover, compare, and pick the right AI tools`,
  description:
    "Explore verified AI tools across categories. Compare features side-by-side, see pricing, and jump to official docs quickly.",
  alternates: { canonical: base ? `${base}/` : "/" },
  openGraph: {
    title: `${SITE_NAME} — AI tools directory`,
    description:
      "Browse the latest AI tools, filter by task and industry, and compare options instantly.",
    url: base ? `${base}/` : undefined,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI tools directory`,
    description:
      "Browse the latest AI tools, filter by task and industry, and compare options instantly.",
  },
};

// Pass-through wrapper; keeps your existing HOME UI exactly the same.
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
