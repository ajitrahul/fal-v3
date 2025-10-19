// app/page.tsx
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import ToolCard from "@/components/ToolCard";
import FeaturedStrip from "@/components/FeaturedStrip"; // client
import CategoryList from "@/components/CategoryList";          // client
import CategoryDrawer from "@/components/CategoryDrawer.client"; // client
import { DB } from "@/lib/data";
import { getSponsoredSet } from "@/lib/ads";

/* ------------------------------ helpers ------------------------------ */

type Tool = (typeof DB)["tools"][number];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildCategories() {
  // Only show categories that have >=1 tool (first category wins when multiple)
  const counts = new Map<string, { name: string; count: number }>();
  for (const t of DB.tools) {
    const cats: string[] = Array.isArray(t.categories) ? t.categories : [];
    const main = cats[0];
    if (!main) continue;
    const key = slugify(main);
    const curr = counts.get(key);
    if (curr) curr.count += 1;
    else counts.set(key, { name: main, count: 1 });
  }
  return Array.from(counts.entries())
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// true-ish only for: true | 1 | "true" | "1" | "yes" | "y"
function isTrueish(v: unknown): boolean {
  if (v === true) return true;
  if (v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return false;
}

// Pick the featured flag from multiple possible places/aliases.
function getFeaturedFlag(t: any): boolean {
  const raw =
    t?.featured ??
    t?.feature ??
    t?.flags?.featured ??
    t?.flags?.feature;
  return isTrueish(raw);
}

function pickFeatured(max = 6): Tool[] {
  // Only keep items explicitly marked featured
  const flagged = DB.tools.filter((t: any) => getFeaturedFlag(t));
  // If none are featured, do NOT fall back to all tools — just hide the section.
  return flagged.slice(0, max);
}

function pickTopRated(max = 8): Tool[] {
  const rated = DB.tools
    .filter((t: any) => t?.community?.rating != null)
    .sort((a: any, b: any) => {
      const ra = +a.community.rating || 0;
      const rb = +b.community.rating || 0;
      // Desc by rating, tie-breaker: more reviews first
      const ca = (a.community.reviews || []).length;
      const cb = (b.community.reviews || []).length;
      if (rb !== ra) return rb - ra;
      return cb - ca;
    });
  return rated.slice(0, max);
}

function pickMostReviewed(max = 8): Tool[] {
  const most = DB.tools
    .filter((t: any) => Array.isArray(t?.community?.reviews) && t.community.reviews.length > 0)
    .sort((a: any, b: any) => (b.community.reviews?.length || 0) - (a.community.reviews?.length || 0));
  return most.slice(0, max);
}

/* -------------------------------- page -------------------------------- */

export default async function Home() {
  const sponsored = await getSponsoredSet();

  const trending = DB.tools.slice(0, 8);
  const newToday = DB.tools.slice(8, 16);

  const categories = buildCategories();
  const featured = pickFeatured(6);      // 3-per-row (via FeaturedStrip styles)
  const topRated = pickTopRated(8);      // shows only if data exists
  const mostReviewed = pickMostReviewed(8);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">FindAIList</h1>
        <p className="text-gray-700">
          Discover, compare, and track AI tools—fast. No hype, just the facts.
        </p>
        <div className="max-w-2xl mx-auto">
          <form action="/tools" className="flex gap-2">
            <input
              type="search"
              name="q"
              placeholder="Search tools, tasks, categories…"
              className="flex-1 rounded-md border px-3 py-2"
              aria-label="Search"
            />
            <button className="rounded-md bg-black text-white px-4">Search</button>
          </form>
        </div>
      </section>

      {/* Sponsored hero slot */}
      <section>
        <AdSlot placement="home_hero" />
      </section>

      {/* Layout: sidebar + content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        {/* LEFT: Categories (desktop) */}
        <div className="hidden md:block">
          {typeof CategoryList === "function" ? (
            <CategoryList items={categories} />
          ) : null}
        </div>

        {/* RIGHT: Content */}
        <div className="space-y-10">
          {/* Mobile: category drawer button */}
          <div className="md:hidden flex">
            {typeof CategoryDrawer === "function" ? (
              <CategoryDrawer items={categories} />
            ) : null}
          </div>

          {/* Featured tools (only if at least one is flagged) */}
          {featured.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Featured tools</h2>
                <span className="text-sm text-gray-600">
                  Hand-picked & sponsored picks
                </span>
              </div>
              {typeof FeaturedStrip === "function" ? (
                <FeaturedStrip tools={featured} />
              ) : null}
            </section>
          )}

          {/* Trending */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Trending this week</h2>
              <Link href="/tools" className="text-sm underline">
                Explore all
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trending.map((t) => (
                <ToolCard
                  key={t.id}
                  tool={t}
                  sponsored={sponsored.has(t.slug)}
                  ctx="home_card"
                />
              ))}
            </div>
          </section>

          {/* New today */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">New today</h2>
              <Link href="/whats-new" className="text-sm underline">
                What’s new
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {newToday.map((t) => (
                <ToolCard
                  key={t.id}
                  tool={t}
                  sponsored={sponsored.has(t.slug)}
                  ctx="home_card"
                />
              ))}
            </div>
          </section>

          {/* Top Rated (renders only if rating data exists) */}
          {topRated.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Top rated</h2>
                <Link href="/tools?sort=rating" className="text-sm underline">
                  Sort by rating
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {topRated.map((t) => (
                  <ToolCard
                    key={t.id}
                    tool={t}
                    sponsored={sponsored.has(t.slug)}
                    ctx="home_card"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Most Reviewed (renders only if any reviews exist) */}
          {mostReviewed.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Most reviewed</h2>
                <Link href="/tools?sort=reviews" className="text-sm underline">
                  Sort by reviews
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mostReviewed.map((t) => (
                  <ToolCard
                    key={t.id}
                    tool={t}
                    sponsored={sponsored.has(t.slug)}
                    ctx="home_card"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
