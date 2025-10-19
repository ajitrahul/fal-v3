// components/compare/CompareTray.tsx
'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'compareTools';

export default function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);
  const sync = () => { try { setIds(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { setIds([]); } };

  useEffect(() => {
    sync();
    const h = () => sync();
    window.addEventListener('compare:updated', h);
    return () => window.removeEventListener('compare:updated', h);
  }, []);

  if (ids.length === 0) return null;

  return (
    <div className="fixed bottom-3 inset-x-3 z-40">
      <div className="rounded-xl border bg-white/90 backdrop-blur px-3 py-2 shadow flex items-center justify-between">
        <div className="text-sm">
          <b>{ids.length}</b> selected for comparison
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs" onClick={() => { localStorage.setItem(KEY, '[]'); setIds([]); }}>
            Clear
          </button>
          <Link className="btn text-xs" href={`/compare?ids=${ids.join(',')}`}>Compare</Link>
        </div>
      </div>
    </div>
  );
}
