'use client';

import Link from 'next/link';

const SHOW = String(process.env.NEXT_PUBLIC_SHOW_GUIDED_UI || '').toLowerCase();
const enabled = SHOW === '1' || SHOW === 'true' || SHOW === 'yes' || SHOW === 'on';

export default function GuidedFloatButton() {
  if (!enabled) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      aria-label="Find the right AI tool"
    >
      <Link
        href="/tools/find"
        className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        {/* icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/>
        </svg>
        Find tools
      </Link>
    </div>
  );
}
