// components/Filters.tsx
'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function Filters({ categories, tasks, roles }:{
  categories: string[]; tasks: string[]; roles: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [q, setQ] = useState(search.get('q') ?? '');
  const [cat, setCat] = useState(search.get('category') ?? '');
  const [task, setTask] = useState(search.get('task') ?? '');
  const [role, setRole] = useState(search.get('role') ?? '');
  const [free, setFree] = useState(search.get('free') === '1');
  const [api, setApi] = useState(search.get('api') === '1');
  const [open, setOpen] = useState(search.get('open_source') === '1');

  const apply = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('category', cat);
    if (task) params.set('task', task);
    if (role) params.set('role', role);
    if (free) params.set('free', '1');
    if (api) params.set('api', '1');
    if (open) params.set('open_source', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="card grid md:grid-cols-3 gap-3 items-end">
      <input className="input" placeholder="Search tools…" value={q} onChange={e => setQ(e.target.value)} />
      <select className="input" value={cat} onChange={e => setCat(e.target.value)}>
        <option value="">All categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="input" value={task} onChange={e => setTask(e.target.value)}>
        <option value="">All tasks</option>
        {tasks.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="input" value={role} onChange={e => setRole(e.target.value)}>
        <option value="">All roles</option>
        {roles.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={free} onChange={e => setFree(e.target.checked)} />
        <span>Free/Freemium</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={api} onChange={e => setApi(e.target.checked)} />
        <span>API available</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} />
        <span>Open-source</span>
      </label>

      <button className="btn" onClick={apply}>Apply</button>
    </div>
  );
}
