"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type CategoryItem = { slug: string; name: string; count: number };

export default function CategoryList({ items }: { items: CategoryItem[] }) {
  const pathname = usePathname() || "";
  return (
    <nav aria-label="Categories" className="rounded-lg border bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-gray-900">Categories</div>
      <ul className="space-y-1">
        {items.map((c) => {
          const href = `/categories/${c.slug}`;
          const active = pathname.startsWith(href);
          return (
            <li key={c.slug}>
              <Link
                href={href}
                className={[
                  "flex items-center justify-between rounded px-2 py-1.5 text-sm",
                  active
                    ? "bg-gray-100 font-medium text-gray-900 border border-gray-200"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span className="truncate">{c.name}</span>
                <span
                  className={[
                    "ml-2 inline-flex min-w-[1.75rem] justify-center rounded-full px-1.5 text-xs",
                    active
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700",
                  ].join(" ")}
                >
                  {c.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
