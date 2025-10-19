'use client';
import { useMemo, useState } from 'react';
import { DB } from '@/lib/data';
import { queryTools } from '@/lib/search';
import ToolCard from '@/components/ToolCard';
export default function Explore() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const tools = useMemo(()=> queryTools(q, cat), [q, cat]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">All Tools</h1>
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="rounded-xl border px-3 py-2" />
        <select value={cat} onChange={e=>setCat(e.target.value)} className="rounded-xl border px-3 py-2">
          <option value="all">All categories</option>
          {DB.categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <div className="text-sm text-gray-600">{tools.length} results</div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(t => <ToolCard key={t.id} tool={t} />)}
      </div>
    </div>
  );
}
