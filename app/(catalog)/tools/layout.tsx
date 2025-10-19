// app/(catalog)/tools/layout.tsx
import React from "react";
import type { Metadata } from "next";

// If you don't have a SITE_NAME export, use the const below and remove the import.
// import { SITE_NAME } from "@/lib/brand";
const SITE_NAME = "AI Tools Directory";

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

// SERVER layout; no "use client" here.
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
