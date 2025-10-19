'use client';
import { useEffect } from 'react';

function getUtm() {
  const p = new URLSearchParams(window.location.search);
  const keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  const utm: Record<string,string> = {};
  keys.forEach(k => { const v = p.get(k); if (v) utm[k] = v; });
  return Object.keys(utm).length ? utm : null;
}

export default function VisitorLogger() {
  useEffect(()=>{
    try {
      fetch('/api/visit', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({
          path: window.location.pathname + window.location.search,
          lang: navigator.language,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen: { w: window.screen.width, h: window.screen.height, dpr: window.devicePixelRatio },
          utm: getUtm()
        })
      });
    } catch {}
  }, []);
  return null;
}
