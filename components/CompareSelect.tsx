// components/CompareSelect.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "compare_ids";

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("compare:change"));
}

export default function CompareSelect({ toolId, toolName }: { toolId: string; toolName?: string }) {
  const [selected, setSelected] = useState(false);
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const sync = () => {
      const ids = readIds();
      setSelected(ids.includes(toolId));
      setCount(ids.length);
    };
    sync();
    const handler = () => sync();
    window.addEventListener("storage", handler);
    window.addEventListener("compare:change", handler as any);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("compare:change", handler as any);
    };
  }, [toolId]);

  function toggle() {
    const ids = readIds();
    if (ids.includes(toolId)) {
      const next = ids.filter((x) => x !== toolId);
      writeIds(next);
      setSelected(false);
      setCount(next.length);
    } else {
      if (ids.length >= 3) {
        alert("You can compare up to 3 tools.");
        return;
      }
      const next = [...ids, toolId];
      writeIds(next);
      setSelected(true);
      setCount(next.length);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center rounded-md border px-3 py-2 text-sm ${selected ? "bg-blue-600 text-white border-blue-600" : "hover:bg-zinc-50"}`}
      aria-pressed={selected}
      title={selected ? "Remove from compare" : "Add to compare"}
    >
      {selected ? "Added" : "Compare"}
      <span className="ml-1 text-xs text-current/80">({count}/3)</span>
    </button>
  );
}
