'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });

type Evt = any;

function groupByDay(evts: Evt[], type?: string){
  const map = new Map<string, number>();
  for (const e of evts){
    if (type && e.type !== type) continue;
    const d = (e.ts || '').slice(0,10);
    if (!d) continue;
    map.set(d, (map.get(d) || 0) + 1);
  }
  return Array.from(map.entries()).sort(([a],[b])=> a<b ? -1 : 1).map(([date, count])=>({ date, count }));
}

function topBy(evts: Evt[], sel: (e:Evt)=>string | null | undefined, limit=10){
  const map = new Map<string, number>();
  for (const e of evts){
    const k = sel(e);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a,b)=> b[1]-a[1]).slice(0,limit).map(([name, count])=>({ name, count }));
}

export default function AdminEvents(){
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch('/data/events.json', { cache: 'no-store' });
        const j = await r.json();
        setEvents(Array.isArray(j) ? j : []);
      } catch { setEvents([]); }
      setLoading(false);
    })();
  }, []);

  const visits = useMemo(()=> events.filter(e => e.type==='visit'), [events]);
  const outbound = useMemo(()=> events.filter(e => e.type==='tool_visit_outbound'), [events]);
  const sponsorClicks = useMemo(()=> events.filter(e => e.type==='sponsor_click'), [events]);

  const visitsByDay = useMemo(()=> groupByDay(visits), [visits]);
  const outByDay = useMemo(()=> groupByDay(outbound), [outbound]);
  const topUtm = useMemo(()=> topBy(visits, (e)=> e.utm?.utm_source, 10), [visits]);
  const topCountries = useMemo(()=> topBy(visits, (e)=> e.geo?.country, 10), [visits]);
  const topOutboundTools = useMemo(()=> topBy(outbound, (e)=> e.tool || e.slug, 10), [outbound]);
  const topSponsors = useMemo(()=> topBy(sponsorClicks, (e)=> e.sponsor, 10), [sponsorClicks]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin — Analytics</h1>
      {loading && <div className="text-gray-600">Loading events…</div>}

      <section className="card">
        <h2 className="font-semibold mb-2">Overview</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="card"><div className="text-xs text-gray-500">Visits</div><div className="text-xl font-semibold">{visits.length}</div></div>
          <div className="card"><div className="text-xs text-gray-500">Outbound clicks</div><div className="text-xl font-semibold">{outbound.length}</div></div>
          <div className="card"><div className="text-xs text-gray-500">Sponsor clicks</div><div className="text-xl font-semibold">{sponsorClicks.length}</div></div>
          <div className="card"><div className="text-xs text-gray-500">All events</div><div className="text-xl font-semibold">{events.length}</div></div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Visits by day</h2>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={visitsByDay}>
              <XAxis dataKey="date" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Outbound by day</h2>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={outByDay}>
              <XAxis dataKey="date" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Top UTM sources</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={topUtm}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Top countries</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={topCountries}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Top outbound tools</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={topOutboundTools}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">Top sponsors</h2>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={topSponsors}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
