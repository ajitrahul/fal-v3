// components/AdSlot.tsx
import React from "react";

type Props = {
  /** Logical placement name, e.g., "tool_footer", "tool_sidebar", etc. */
  placement?: string;
  /** Optional explicit href override (skips env lookup) */
  href?: string | null;
  className?: string;
  children?: React.ReactNode;
};

function getHref(placement?: string): string | null {
  if (!placement || typeof placement !== "string") return null;
  const key = `NEXT_PUBLIC_ADHREF_${placement.toUpperCase()}`;
  const val = process.env[key as keyof NodeJS.ProcessEnv];
  return typeof val === "string" && val.trim() ? val : null;
}

/** Renders nothing if no valid ad href is configured (prevents runtime crashes). */
export default function AdSlot({ placement, href, className, children }: Props) {
  const link = href ?? getHref(placement);
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "block rounded-md border bg-white p-3 hover:bg-gray-50"}
    >
      {children ?? <span className="text-sm text-gray-700">Sponsored</span>}
    </a>
  );
}
