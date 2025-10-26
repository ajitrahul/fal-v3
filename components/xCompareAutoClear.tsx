// components/CompareAutoClear.tsx
"use client";

import { useEffect } from "react";

/** Clears the compare selection once the compare page renders. */
export default function CompareAutoClear() {
  useEffect(() => {
    try {
      localStorage.removeItem("compareTools");
      // notify all tabs & ToolCards
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "compareTools",
          newValue: "[]",
        } as any)
      );
    } catch {}
  }, []);

  return null;
}
