// components/CompareSelectionReset.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Clears localStorage "compareTools" on first mount when not on /compare.
 * Also clears shortly after mounting on /compare so ticks are gone once
 * users navigate back to Home/Tools.
 */
export default function CompareSelectionReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clear = () => {
      try {
        localStorage.setItem("compareTools", JSON.stringify([]));
        // Notify all listeners (ToolCards, trays, etc.)
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "compareTools",
            newValue: "[]",
          } as any)
        );
      } catch {}
    };

    if (pathname === "/compare") {
      // Clear shortly after the compare page mounts (so once the user
      // goes back, nothing remains selected)
      const t = setTimeout(clear, 800);
      return () => clearTimeout(t);
    } else {
      // Clear immediately on any non-compare page (e.g., Home, tool details)
      clear();
    }
  }, [pathname]);

  return null;
}
