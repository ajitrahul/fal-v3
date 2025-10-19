// components/TopRatedStrip.tsx
import Link from "next/link";
import ToolCard from "./ToolCard";
import { DB } from "@/lib/data";

type Tool = (typeof DB)["tools"][number];

function getRating(t: any): number {
  const r = t?.community?.rating;
  const n = typeof r === "string" ? parseFloat(r) : Number(r);
  return Number.isFinite(n) ? n : 0;
}
function getReviews(t: any): number {
  return Array.isArray(t?.community?.reviews) ? t.community.reviews.length : 0;
}
function isRecent(t: any, days = 14) {
  const v = t?.updated_at || t?.release_date;
  const ts = v ? new Date(v).getTime() : 0;
  if (!ts) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return ts >= cutoff;
}

export default function TopRatedStrip({ limit = 8 }: { limit?: number }) {
  const withRatings = DB.tools.filter((t) => getRating(t) > 0);

  // Prefer items updated recently; if too few, fall back to all
  const recent = withRatings.filter((t) => isRecent(t, 14));
  const base = recent.length >= 6 ? recent : withRatings;

  const ranked = [...base].sort((a, b) => {
    const rb = getRating(b);
    const ra = getRating(a);
    if (rb !== ra) return rb - ra;
    return getReviews(b) - getReviews(a);
  });

  const list = ranked.slice(0, limit);
  if (list.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Top rated this week</h2>
        <Link href="/tools?sort=rating" className="text-sm underline">
          View more
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((t) => (
          <ToolCard key={t.id} tool={t} sponsored={false} ctx="top_rated" />
        ))}
      </div>
    </section>
  );
}
