// components/SiteFooter.tsx
import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className={[
        "border-t",
        "bg-white text-gray-700 border-gray-200",
        "dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-800",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Find AI List
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
              Discover, compare, and keep up with the latest AI tools, models, and news.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Explore
            </h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link className="hover:underline" href="/">
                  Home
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/ai-news">
                  AI News
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/compare">
                  Compare
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Contribute
            </h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link className="hover:underline" href="/submit">
                  Submit a Tool
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/edit">
                  Suggest an Edit
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              About
            </h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link className="hover:underline" href="/about">
                  About Us
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/privacy">
                  Privacy
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/terms">
                  Terms
                </Link>
              </li>
              {/* If you have a sitemap route */}
              <li>
                <Link className="hover:underline" href="/sitemap.xml">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Find AI List. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
