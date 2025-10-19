'use client';
import { useEffect, useState } from 'react';

export default function Admin() {
  const [subs, setSubs] = useState<any[]>([]);
  const [token, setToken] = useState<string>('');

  async function load() {
    const res = await fetch('/data/submissions.json').catch(()=>null);
    if (!res || !res.ok) return setSubs([]);
    const data = await res.json();
    setSubs(data);
  }
  useEffect(()=>{ load(); }, []);

  async function approve(i:number){
    const res = await fetch('/api/admin/approve', { method:'POST', headers:{'content-type':'application/json','x-admin-token':token}, body: JSON.stringify({ submissionIndex: i }) });
    if (res.ok) load();
    else alert('Approve failed');
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Admin — Submissions</h1>
      <input type="password" placeholder="ADMIN_TOKEN" value={token} onChange={e=>setToken(e.target.value)} className="rounded-xl border px-3 py-2" />
      <ul className="space-y-3">
        {subs.length===0 && <li className="text-gray-600">No pending submissions.</li>}
        {subs.map((s, i)=>(
          <li key={i} className="card">
            <div className="font-medium">{s.name}</div>
            <div className="text-sm text-gray-600">{s.website_url}</div>
            <div className="text-sm">{s.summary}</div>
            <button onClick={()=>approve(i)} className="mt-2 badge border-gray-300 px-3 py-2">Approve → Tools</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
