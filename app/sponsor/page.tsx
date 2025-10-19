import sponsorships from '@/data/sponsorships.json';

export default function Sponsor() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sponsor & Advertise</h1>
      <p className="text-gray-600">Tasteful, clearly-labeled placements that don’t hurt UX. Reach buyers when they’re evaluating tools.</p>
      <h2 className="font-semibold mt-4">Available Placements</h2>
      <ul className="grid md:grid-cols-2 gap-3">
        {sponsorships.inventory.map((inv:any)=>(
          <li key={inv.slot} className="card">
            <div className="font-medium">{inv.label}</div>
            <div className="text-sm text-gray-600">Slot: <code>{inv.slot}</code></div>
            <div className="text-sm text-gray-600">Specs: {inv.specs}</div>
            <div className="text-sm">{inv.active ? 'Active' : 'Inactive'}</div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-600">Contact: <a className="link" href="mailto:ads@yoursite.com">ads@yoursite.com</a></p>
    </div>
  );
}
