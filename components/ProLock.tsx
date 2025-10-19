'use client';
export default function ProLock({ feature }: { feature: string }) {
  const isPro = typeof window !== 'undefined' && localStorage.getItem('pro') === '1';
  if (isPro) return null;
  return (
    <div className="text-xs text-gray-600">
      <span className="badge border-gray-300 mr-2">Pro</span>
      {feature} is a Pro feature. <a className="link" href="/pro">Learn more</a>
    </div>
  );
}
