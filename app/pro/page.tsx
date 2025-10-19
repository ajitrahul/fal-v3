'use client';
import { useEffect, useState } from 'react';
export default function Pro() {
  const [isPro, setIsPro] = useState(false);
  useEffect(()=>{
    setIsPro(localStorage.getItem('pro')==='1');
  }, []);
  function toggle(){
    const next = !isPro;
    localStorage.setItem('pro', next ? '1' : '0');
    setIsPro(next);
  }
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">InsightForge Pro</h1>
      <ul className="list-disc ml-5 text-gray-700">
        <li>Save tools to private lists</li>
        <li>Alerts for price changes & new tools in categories</li>
        <li>Compare up to 4 tools side-by-side</li>
      </ul>
      <button onClick={toggle} className="badge border-gray-300 px-3 py-2">{isPro ? 'Disable (demo)' : 'Enable Pro (demo)'}</button>
      <p className="text-xs text-gray-600">Demo toggle sets a local flag. Replace with real billing/entitlements later.</p>
    </div>
  );
}
