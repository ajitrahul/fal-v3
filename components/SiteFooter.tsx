// components/SiteFooter.tsx
"use client";

import Link from "next/link";

const Svg = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d={d} />
  </svg>
);

const Links = {
  quick: [
    { href: "/?quick=new", label: "New" },
    { href: "/?quick=free", label: "Free Tier" },
    { href: "/?quick=api", label: "Has API" },
    { href: "/?quick=open", label: "Open Source" },
    { href: "/?quick=video", label: "Has Video" },
    { href: "/?favorites=1", label: "Favorites" },
    { href: "/compare", label: "Compare" },
  ],
  actions: [
    { href: "/submit", label: "Submit Tool" },
    { href: "/submit?mode=edit", label: "Edit Existing" },
  ],
};

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white py-10 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
        <div className="col-span-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-zinc-100">
            AI Tools Directory
          </h3>
          <p className="max-w-xl">
            Discover, filter, and compare AI tools, models, and platforms. Theme follows{" "}
            <code>NEXT_PUBLIC_TOOLCARD_THEME</code>.
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-zinc-100">
            Quick Filters
          </h4>
          <ul className="space-y-1">
            {Links.quick.map((q) => (
              <li key={q.label}>
                <Link href={q.href} className="hover:text-gray-900 dark:hover:text-zinc-200">
                  {q.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-zinc-100">
            Contribute
          </h4>
          <ul className="space-y-1">
            {Links.actions.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="hover:text-gray-900 dark:hover:text-zinc-200">
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              title="Sign in"
            >
              <Svg d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          © {new Date().getFullYear()} AI Tools Directory
        </p>
      </div>
    </footer>
  );
}
