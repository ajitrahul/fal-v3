'use client';
import { useEffect, useState } from 'react';

type EnvInfo = {
  SITE_URL: boolean;
  ADMIN_TOKEN: boolean;
  NEXT_PUBLIC_GA4_ID: boolean;
  node: string;
  next: string;
  react: string;
  mode: string;
};

export default function AdminHealth() {
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [reach, setReach] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState<string>('');
  const [ga4, setGa4] = useState<boolean>(false);

  useEffect(()=>{
    fetch('/api/env').then(r=>r.json()).then(setEnv);
    fetch('/api/health').then(r=>r.json()).then(setHealth);

    const c = localStorage.getItem('analytics_consent') || 'essential';
    setConsent(c);
    setGa4(typeof window !== 'undefined' && !!(window as any).gtag);
  }, []);

  useEffect(()=>{
    if (!health?.endpoints) return;
    const map: Record<string, boolean> = {};
    const hits: string[] = [health.endpoints.sitemap, health.endpoints.robots, ...health.endpoints.sitemaps];
    Promise.all(hits.map(async (p: string) => {
      try {
        const r = await fetch(p, { cache: 'no-store' });
        map[p] = r.ok;
      } catch {
        map[p] = false;
      }
    })).then(()=> setReach(map));
  }, [health]);

  function Badge({ ok }: { ok: boolean }) {
    return <span className={'badge ' + (ok ? 'border-green-300' : 'border-red-300')}>{ok ? 'OK' : 'Missing'}</span>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Admin — Environment Health</h1>

      <section className="card">
        <h2 className="font-semibold mb-2">Env Vars (presence only)</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div>SITE_URL {env && <Badge ok={env.SITE_URL} />}</div>
          <div>ADMIN_TOKEN {env && <Badge ok={env.ADMIN_TOKEN} />}</div>
          <div>NEXT_PUBLIC_GA4_ID {env && <Badge ok={env.NEXT_PUBLIC_GA4_ID} />}</div>
        </div>
        <div className="text-xs text-gray-600 mt-2">Values are never exposed here. Presence only.</div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Analytics</h2>
        <div className="text-sm">Consent: <span className="badge border-gray-300">{consent || 'unknown'}</span></div>
        <div className="text-sm">GA4 loaded (gtag present): <span className="badge border-gray-300">{ga4 ? 'yes' : 'no'}</span></div>
        <button className="badge border-gray-300 px-3 py-2 mt-2" onClick={async ()=>{
          const r = await fetch('/api/track', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ type:'health_test_event' }) });
          alert(r.ok ? 'Event logged (server-side JSON)' : 'Failed to log');
        }}>Send test event</button>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">SEO Endpoints</h2>
        <ul className="text-sm space-y-1">
          {health?.endpoints && (
            <>
              <li>/sitemap.xml — {reach['/sitemap.xml'] ? '200 OK' : 'NOT OK'}</li>
              {health.endpoints.sitemaps.map((p: string) => (<li key={p}>{p} — {reach[p] ? '200 OK' : 'NOT OK'}</li>))}
              <li>/robots.txt — {reach['/robots.txt'] ? '200 OK' : 'NOT OK'}</li>
            </>
          )}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Data Stores</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div>tools.json: {health?.data?.tools ?? '—'}</div>
          <div>submissions.json: {health?.data?.submissions ?? '—'}</div>
          <div>events.json: {health?.data?.events ?? '—'}</div>
          <div>newsletter.json: {health?.data?.newsletter ?? '—'}</div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Runtime</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div>Node: {env?.node}</div>
          <div>Next.js: {env?.next}</div>
          <div>React: {env?.react}</div>
          <div>Mode: {env?.mode}</div>
        </div>
      </section>
          <section className="card">
        <h2 className="font-semibold mb-2">Uptime</h2>
        <UptimeBlock />
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">File System</h2>
        <FSBlock />
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Cache / ISR</h2>
        <CacheBlock />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | boolean }){
  return <div className="flex justify-between gap-3 text-sm"><span className="text-gray-600">{label}</span><span>{String(value)}</span></div>;
}

function useJson<T = any>(url: string, init?: RequestInit){
  const [data, setData] = (require('react') as any).useState<T | null>(null);
  const [err, setErr] = (require('react') as any).useState<string | null>(null);
  (require('react') as any).useEffect(()=>{
    let alive = true;
    fetch(url, init).then(r=>r.json()).then(d=>{ if(alive) setData(d); }).catch(e=>{ if(alive) setErr(String(e)); });
    return ()=>{ alive = false; };
  }, [url]);
  return { data, err };
}

function UptimeBlock(){
  const { data } = useJson<{ startedAtIso: string; uptimeSeconds: number }>('/api/uptime');
  if (!data) return <div className="text-sm text-gray-600">Loading…</div>;
  return (
    <div className="space-y-1">
      <Row label="Started" value={data.startedAtIso} />
      <Row label="Uptime (s)" value={data.uptimeSeconds} />
    </div>
  );
}

function FSBlock(){
  const { data } = useJson<any>('/api/fs-check');
  if (!data) return <div className="text-sm text-gray-600">Loading…</div>;
  return (
    <div className="space-y-1">
      <Row label="data dir" value={data.dataDir} />
      <Row label="readable" value={data.readable} />
      <Row label="writable" value={data.writable} />
      <Row label="cleaned" value={data.cleaned} />
      {data.error && <div className="text-sm text-red-600">Error: {data.error}</div>}
    </div>
  );
}

function CacheBlock(){
  const { data } = useJson<{ nodeEnv: string; isDev: boolean; note: string }>('/api/cache-info');
  if (!data) return <div className="text-sm text-gray-600">Loading…</div>;
  return (
    <div className="space-y-1">
      <Row label="NODE_ENV" value={data.nodeEnv} />
      <Row label="dev mode" value={data.isDev} />
      <div className="text-xs text-gray-600">{data.note}</div>
    </div>
  );
}
