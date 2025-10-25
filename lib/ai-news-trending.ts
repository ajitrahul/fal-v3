// lib/ai-news-trending.ts
// Tiny helpers for archives & trending views (no deps)

export type YMD = string; // "YYYY-MM-DD"

// UTC yyyy-mm-dd for a given date (default: now)
export function ymdUTC(d: Date | string | number = new Date()): YMD {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse "YYYY-MM-DD" as a Date at 00:00:00.000 UTC
export function parseYMD(ymd: string): Date {
  // Defensive: accept only simple YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error(`Invalid YMD: ${ymd}`);
  const [_, ys, ms, ds] = m;
  const y = Number(ys), mo = Number(ms) - 1, d = Number(ds);
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
}

// Inclusive day window in ISO for fetchNews({from,to})
export function dayWindowISO(ymd: string): { from: string; to: string } {
  const start = parseYMD(ymd);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999
  return { from: start.toISOString(), to: end.toISOString() };
}

// Types mirrored from ai-news-feeds
export type NewsItem = {
  title: string;
  url: string;
  date?: string;
  source: string;
  sourceId: string;
  categories?: string[];
};

export type DayBucket = {
  ymd: YMD;
  items: NewsItem[];
  count: number;
};

// Group items by UTC yyyy-mm-dd (using item.date)
export function bucketByDay(items: NewsItem[]): DayBucket[] {
  const map = new Map<YMD, NewsItem[]>();
  for (const it of items) {
    if (!it?.date) continue;
    const key = ymdUTC(it.date);
    const arr = map.get(key) ?? [];
    arr.push(it);
    map.set(key, arr);
  }
  const buckets: DayBucket[] = Array.from(map.entries()).map(([key, arr]) => ({
    ymd: key,
    items: arr.sort((a, b) => (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0)),
    count: arr.length,
  }));
  // Sort: bigger buckets first, tie-break by most recent day
  buckets.sort((a, b) => (b.count - a.count) || (a.ymd < b.ymd ? 1 : -1));
  return buckets;
}
