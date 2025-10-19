'use client';
import { useEffect, useState } from 'react';

export default function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(()=>{
    const c = localStorage.getItem('analytics_consent');
    if (!c) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 bg-white border shadow-lg rounded-xl p-3 max-w-lg w-[92%]">
      <div className="text-sm text-gray-700">
        We use privacy-first analytics. Allow optional cookies (GA4) for better insights?
      </div>
      <div className="mt-2 flex gap-2">
        <button className="badge border-gray-300 px-3 py-2" onClick={()=>{ localStorage.setItem('analytics_consent','essential'); setShow(false); }}>Essential only</button>
        <button className="badge border-gray-300 px-3 py-2" onClick={()=>{ localStorage.setItem('analytics_consent','all'); location.reload(); }}>Allow all</button>
      </div>
    </div>
  );
}
