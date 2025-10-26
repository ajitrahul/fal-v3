// components/CompareProvider.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const COMPARE_STORAGE_KEY = "compareTools"; // <- what CompareClient.tsx imports
const MAX_COMPARE = 3;

type Ctx = {
  items: string[];                 // slugs
  add: (slug: string) => void;
  remove: (slug: string) => void;
  toggle: (slug: string) => void;
  clear: () => void;
  disabledForNew: boolean;         // true if already at MAX_COMPARE
};

const CompareCtx = createContext<Ctx | null>(null);

function getStored(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}
function setStored(arr: string[]) {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(arr));
    // propagate across tabs/components
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: COMPARE_STORAGE_KEY,
        newValue: JSON.stringify(arr),
      } as any)
    );
  } catch {}
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  // boot from localStorage + listen to changes
  useEffect(() => {
    setItems(getStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === COMPARE_STORAGE_KEY) setItems(getStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<Ctx>(() => {
    return {
      items,
      add: (slug: string) => {
        setItems((cur) => {
          if (cur.includes(slug)) return cur;
          if (cur.length >= MAX_COMPARE) return cur; // ignore if full
          const next = [...cur, slug];
          setStored(next);
          return next;
        });
      },
      remove: (slug: string) => {
        setItems((cur) => {
          const next = cur.filter((s) => s !== slug);
          setStored(next);
          return next;
        });
      },
      toggle: (slug: string) => {
        setItems((cur) => {
          if (cur.includes(slug)) {
            const next = cur.filter((s) => s !== slug);
            setStored(next);
            return next;
          }
          if (cur.length >= MAX_COMPARE) return cur;
          const next = [...cur, slug];
          setStored(next);
          return next;
        });
      },
      clear: () => {
        setStored([]);
        setItems([]);
      },
      disabledForNew: items.length >= MAX_COMPARE,
    };
  }, [items]);

  return <CompareCtx.Provider value={api}>{children}</CompareCtx.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareCtx);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
