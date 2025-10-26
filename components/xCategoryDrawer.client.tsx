// components/CategoryDrawer.client.tsx
"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

type Item = { name: string; slug: string };
type Props = {
  /** Items shown inside the drawer */
  items: Item[];
  /** Optional label for the trigger button */
  label?: string;
  /** Optional className for the wrapper */
  className?: string;
};

/**
 * CategoryDrawer renders a mobile-only sidebar (md:hidden).
 * It renders a stable closed-state DOM for SSR so hydration matches.
 */
export default function CategoryDrawer({ items, label = "Browse categories", className = "" }: Props) {
  // IMPORTANT: initial closed state must be the same on server and client
  const [open, setOpen] = useState(false);
  const titleId = useId();

  // Prevent body scroll only when open (client-only effect)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Stable SSR markup: we always render the trigger button + the drawer container,
  // but keep it *visually* closed (off-canvas) until `open` flips true on the client.
  return (
    <div className={`md:hidden ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={titleId}
        className="rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
      >
        {label}
      </button>

      {/* Overlay + Panel container - always present to keep SSR/CSR identical.
          We control interactivity/visibility with classes only. */}
      <div
        className={`fixed inset-0 z-50 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Click-away scrim */}
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

        {/* Drawer panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 id={titleId} className="text-sm font-semibold">
              Categories
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border bg-white px-2 py-1 text-xs shadow-sm"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <nav className="max-h-[calc(100vh-44px)] overflow-y-auto p-2">
            <ul className="space-y-1">
              {items.map((it) => (
                <li key={it.slug}>
                  <Link
                    href={`/tools/${it.slug}`}
                    className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                  >
                    {it.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
