// app/tools/layout.tsx
import React from "react";
import type { Metadata } from "next";

// If you don't have this, hardcode your site name:
// export const SITE_NAME = "Your Site";
import { SITE_NAME } from "@/lib/brand";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: `Browse AI tools — ${SITE_NAME}`,
  description:
    "Filter and search AI tools by category, task, industry, models, and more. Jump into details or compare side-by-side.",
  alternates: { canonical: base ? `${base}/tools` : "/tools" },
  openGraph: {
    title: `Browse AI tools — ${SITE_NAME}`,
    description:
      "Filter and search AI tools by category, task, industry, models, and more.",
    url: base ? `${base}/tools` : undefined,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `Browse AI tools — ${SITE_NAME}`,
    description:
      "Filter and search AI tools by category, task, industry, models, and more.",
  },
};

// SERVER layout that just wraps your existing /tools page.
// IMPORTANT: keep this as a server component (no "use client").
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
