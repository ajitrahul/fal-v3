// components/compare/AddToCompareButton.tsx
'use client';
import { useEffect, useState } from 'react';

const KEY = 'compareTools';

function readSet(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function writeSet(arr: string[]) { localStorage.setItem(KEY, JSON.stringify(arr.slice(0,3))); }

export default function AddToCompareButton({ slug, name }:{ slug: string; name: string }) {
  const [selected, setSelected] = useState(false);
  useEffect(()=>{
    setSelected(readSet().includes(slug));
  },[slug]);

  const toggle = () => {
    const cur = readSet();
    if (cur.includes(slug)) {
      writeSet(cur.filter(s => s !== slug));
      setSelected(false);
    } else {
      if (cur.length >= 3) {
        alert('You can compare up to 3 tools.');
        return;
      }
      writeSet([...cur, slug]);
      setSelected(true);
    }
    window.dispatchEvent(new CustomEvent('compare:updated'));
  };

  return (
    <button className={selected ? 'btn-danger text-xs' : 'btn text-xs'} onClick={toggle}>
      {selected ? 'Remove' : 'Compare'}
    </button>
  );
}
