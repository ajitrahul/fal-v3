'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type CompareCtx = {
  slugs: string[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  max: number;
};

const Ctx = createContext<CompareCtx | null>(null);
const STORAGE_KEY = 'compare_slugs_v1';
const MAX = 3;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setSlugs(Array.from(new Set(arr.map((s: any) => String(s)))).slice(0, MAX));
        }
      }
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {}
  }, [slugs]);

  const api = useMemo<CompareCtx>(() => ({
    slugs,
    add: (slug: string) => {
      const s = String(slug || '').trim().toLowerCase();
      if (!s) return;
      setSlugs(prev => {
        const next = Array.from(new Set([...prev, s]));
        return next.slice(0, MAX);
      });
    },
    remove: (slug: string) => {
      const s = String(slug || '').trim().toLowerCase();
      setSlugs(prev => prev.filter(x => x !== s));
    },
    clear: () => setSlugs([]),
    has: (slug: string) => slugs.includes(String(slug || '').trim().toLowerCase()),
    max: MAX,
  }), [slugs]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCompare must be used within CompareProvider');
  return c;
}
