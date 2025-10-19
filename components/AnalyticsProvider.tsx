'use client';
import { useEffect } from 'react';

declare global { interface Window { dataLayer: any[]; gtag: (...args:any[])=>void } }

export default function AnalyticsProvider() {
  useEffect(()=>{
    const id = process.env.NEXT_PUBLIC_GA4_ID;
    const consent = localStorage.getItem('analytics_consent') || 'essential';
    if (!id || consent !== 'all') return;
    // Inject gtag
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s1);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments as any); } as any;
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    return () => { s1.remove(); };
  }, []);
  return null;
}
