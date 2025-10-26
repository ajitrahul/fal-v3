'use client';
import { useState } from 'react';

export default function AIComparison({ ids }: { ids: string[] }){
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [fmt, setFmt] = useState<'json'|'markdown'>('json');
  const [stream, setStream] = useState(false);
  const [md, setMd] = useState('');

  async function go(){
    setData(null); setMd('');
    if (stream && fmt === 'markdown') {
      setLoading(true);
      const r = await fetch('/api/compare/ai/stream', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ ids }) });
      const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setMd(acc);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const r = await fetch('/api/compare/ai', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ ids, format: fmt }) });
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">AI comparison (Gemini)</div>
        <div className="flex gap-2 items-center text-sm">
          <label className="text-gray-600">Format</label>
          <select className="badge border-gray-300" value={fmt} onChange={e=>setFmt(e.target.value as any)}>
            <option value="json">Structured</option>
            <option value="markdown">Markdown</option>
          </select>
          <label className="text-gray-600 flex items-center gap-1">
            <input type="checkbox" checked={stream} onChange={e=>setStream(e.target.checked)} />
            <span>Stream (markdown only)</span>
          </label>
          <button className="badge border-gray-300 px-3 py-2" disabled={loading} onClick={go}>
            {loading ? 'Generating…' : 'Generate AI comparison'}
          </button>
        </div>
      </div>
      {(data || md) && (
        <div className="mt-3 space-y-3">
          {(data?.format === 'markdown' || md) && (
            <div>
              <Toolbar content={(data?.markdown || md) as string} ids={ids} />
              <pre className="whitespace-pre-wrap text-sm mt-2">{(data?.markdown || md) as string}</pre>
            </div>
          )}
          {data?.format === 'json' && (
            <div>
              <Toolbar content={JSON.stringify(data, null, 2)} ids={ids} isJson />
              <JSONView obj={data} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toolbar({ content, ids, isJson }: { content: string, ids: string[], isJson?: boolean }){
  const canSave = typeof window !== 'undefined' && localStorage.getItem('pro') === '1';
  async function copy(){
    try { await navigator.clipboard.writeText(content); alert('Copied'); } catch {}
  }
  function download(){
    const blob = new Blob([content], { type: isJson ? 'application/json' : 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = isJson ? 'comparison.json' : 'comparison.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function save(){
    if (!canSave) { alert('Enable Pro on /pro to save.'); return; }
    const key = 'savedComparisons';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ ids, ts: new Date().toISOString(), content, format: isJson ? 'json' : 'markdown' });
    localStorage.setItem(key, JSON.stringify(arr));
    alert('Saved to your Pro list');
  }
  return (
    <div className="flex gap-2">
      <button className="badge border-gray-300 px-3 py-2" onClick={copy}>Copy</button>
      <button className="badge border-gray-300 px-3 py-2" onClick={download}>Download {isJson ? '.json' : '.md'}</button>
      <button className="badge border-gray-300 px-3 py-2" onClick={save}>Save to list (Pro)</button>
    </div>
  );
}

function JSONView({ obj }: { obj: any }){
  function Row({label, children}:{label:string;children:any}){
    return <div className="border-b py-2"><div className="text-xs uppercase text-gray-500">{label}</div><div className="text-sm">{children}</div></div>;
  }
  return (
    <div className="space-y-2 text-sm">
      {obj.tldr && <Row label="TL;DR"><ul className="list-disc ml-5">{obj.tldr.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></Row>}
      {obj.dimensions && <Row label="Dimensions">{obj.dimensions.map((d:any,i:number)=>(
        <div key={i} className="mb-2">
          <div className="font-medium">{d.name}</div>
          <ul className="list-disc ml-5">
            {(d.verdicts||[]).map((v:any,j:number)=><li key={j}><b>{v.tool}</b>: {v.score}/5 — {v.evidence}</li>)}
          </ul>
        </div>
      ))}</Row>}
      {obj.pros_cons && <Row label="Pros & Cons">{obj.pros_cons.map((pc:any,i:number)=>(
        <div key={i} className="mb-2">
          <div className="font-medium">{pc.tool}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><div className="text-xs text-gray-500">Pros</div><ul className="list-disc ml-5">{(pc.pros||[]).map((p:string,k:number)=><li key={k}>{p}</li>)}</ul></div>
            <div><div className="text-xs text-gray-500">Cons</div><ul className="list-disc ml-5">{(pc.cons||[]).map((p:string,k:number)=><li key={k}>{p}</li>)}</ul></div>
          </div>
        </div>
      ))}</Row>}
      {obj.who_should_choose && <Row label="Who should choose what">{obj.who_should_choose.map((w:any,i:number)=>(
        <div key={i}><b>{w.persona}:</b> pick <code>{w.pick}</code> — {w.why}</div>
      ))}</Row>}
      {obj.decision_matrix && <Row label="Decision matrix">{obj.decision_matrix.map((d:any,i:number)=>(
        <div key={i}><b>{d.criterion}:</b> <code>{d.best}</code> — {d.reason}</div>
      ))}</Row>}
      {obj.caveats && <Row label="Caveats"><ul className="list-disc ml-5">{obj.caveats.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></Row>}
      {obj.error && <Row label="Model error">{obj.raw || 'Model returned invalid JSON.'}</Row>}
    </div>
  );
}
