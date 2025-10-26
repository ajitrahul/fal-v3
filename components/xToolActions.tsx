'use client';
import { track } from '@/lib/analytics';

export default function ToolActions({ slug }: { slug: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <button className="badge border-gray-300 px-3 py-2" onClick={()=>track({ type:'tool_saved', slug })}>Save</button>
      <button className="badge border-gray-300 px-3 py-2" onClick={()=>track({ type:'alert_requested', slug })}>Alerts</button>
    </div>
  );
}
