// components/RouteProgress.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Minimal route progress indicator for the App Router:
 * - Shows when clicking internal <a> links
 * - Hides when pathname/search changes (navigation complete)
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Start progress on internal link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!target) return;

      const href = target.getAttribute("href") || "";
      const isNewTab = target.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
      const isExternal = /^https?:\/\//i.test(href);
      if (!href || isNewTab || isExternal || href.startsWith("#")) return;

      // Internal navigation → show progress
      setActive(true);
      setWidth(20);
      // Grow slowly while loading
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setWidth((w) => (w < 90 ? w + Math.max(1, (90 - w) * 0.05) : w));
      }, 120) as unknown as number;
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Complete progress when URL actually changes
  useEffect(() => {
    if (!active) return;
    setWidth(100);
    const t = window.setTimeout(() => {
      setActive(false);
      setWidth(0);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search?.toString()]);

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[100] h-0.5 w-full bg-transparent"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="h-full bg-emerald-500 transition-[width,opacity] duration-200 ease-out dark:bg-emerald-400"
        style={{ width: `${width}%`, opacity: active ? 1 : 0 }}
      />
    </div>
  );
}
