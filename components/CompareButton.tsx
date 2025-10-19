// components/CompareButton.tsx
"use client";

import { useEffect, useState } from "react";
import { addCompareId, removeCompareId, isInCompare, getCompareCount } from "@/lib/compareStore";

export default function CompareButton({
  slug,
  labelAdd = "Add to Compare",
  labelRemove = "Remove from Compare",
  size = "sm",
}: {
  slug: string;
  labelAdd?: string;
  labelRemove?: string;
  size?: "sm" | "md";
}) {
  const [active, setActive] = useState(isInCompare(slug));
  const [count, setCount] = useState(getCompareCount());

  useEffect(() => {
    const handler = () => {
      setActive(isInCompare(slug));
      setCount(getCompareCount());
    };
    window.addEventListener("compare:changed", handler);
    return () => window.removeEventListener("compare:changed", handler);
  }, [slug]);

  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (active) {
      removeCompareId(slug);
    } else {
      const ok = addCompareId(slug);
      if (!ok) {
        alert("You can compare up to 3 tools.");
      }
    }
    setActive(isInCompare(slug));
    setCount(getCompareCount());
  };

  const cls =
    size === "sm"
      ? "rounded-md border px-2 py-1 text-xs"
      : "rounded-md border px-3 py-2 text-sm";

  return (
    <button onClick={click} className={`${cls} ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"}`}>
      {active ? labelRemove : labelAdd} {count ? `(${count}/3)` : ""}
    </button>
  );
}
