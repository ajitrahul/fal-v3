'use client';
import { useState } from 'react';

export default function AdminImport(){
  const [jsonText, setJsonText] = useState('');
  const [token, setToken] = useState('');
  const [res, setRes] = useState<any>(null);

  async function merge(){
    setRes(null);
    const r = await fetch('/api/admin/merge-tools', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-token': token },
      body: jsonText
    });
    const j = await r.json();
    setRes(j);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Admin — Import / Merge Tools</h1>
      <p className="text-sm text-gray-600">Paste a JSON array of tools (full objects or partials by <code>slug</code>). Existing tools will be merged; new slugs will be appended.</p>
      <input type="password" className="input w-full" placeholder="ADMIN_TOKEN" value={token} onChange={e=>setToken(e.target.value)} />
      <textarea className="textarea w-full h-60" placeholder='[{"slug":"tool-1","summary":"..."}]' value={jsonText} onChange={e=>setJsonText(e.target.value)} />
      <button className="badge border-gray-300 px-3 py-2" onClick={merge}>Merge</button>
      {res && <pre className="text-xs bg-gray-50 p-3 rounded">{JSON.stringify(res, null, 2)}</pre>}
    </div>
  );
}
