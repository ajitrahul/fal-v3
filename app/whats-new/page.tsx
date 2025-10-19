// app/whats-new/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { readEditorial, recentToolUpdates } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "What’s New Today — FindAIList",
  description: "Daily feed of new tools and notable updates. Curated, fast, no hype.",
  alternates: { canonical: "/whats-new" },
};

function withUtm(url: string, ctx: "whats_new"): string {
  try {
    const u = new URL(url, "http://dummy");
    const isRelative = u.origin === "http://dummy";
    const out = new URL(isRelative ? url : u.href);
    out.searchParams.set("utm_source", "findailist");
    out.searchParams.set("utm_medium", "referral");
    out.searchParams.set("utm_campaign", ctx);
    return out.toString();
  } catch {
    return url;
  }
}

export default async function WhatsNewPage() {
  const posts = await readEditorial();              // your manual entries
  const updates = recentToolUpdates(14);            // automatic 14-day window

  // merge feeds (manual first, then updates)
  const items = [
    ...posts.map((p) => ({
      key: `post:${p.id}`,
      title: p.title,
      date: p.date,
      summary: p.summary,
      links: p.links || [],
      tags: p.tags || [],
    })),
    ...updates.map((u) => ({
      key: `update:${u.title}`,
      title: u.title,
      date: u.date,
      summary: u.summary,
      links: [{ title: "View tool →", url: u.url }],
      tags: ["update"],
    })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">What’s New Today</h1>
        <p className="text-gray-600">
          Fresh additions and meaningful updates from the AI tools ecosystem.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <div className="font-medium">Nothing new yet.</div>
          <div className="text-sm text-gray-600 mt-1">Check back tomorrow.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <article key={it.key} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{it.title}</h2>
                <div className="text-xs text-gray-500">{new Date(it.date).toLocaleDateString()}</div>
              </div>
              {it.tags?.length ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {it.tags.map((t) => (
                    <span key={t} className="text-[11px] rounded bg-gray-100 text-gray-700 px-2 py-1">{t}</span>
                  ))}
                </div>
              ) : null}
              {it.summary ? <p className="mt-2 text-sm text-gray-800">{it.summary}</p> : null}
              {it.links?.length ? (
                <ul className="mt-3 text-sm space-y-1">
                  {it.links.map((l, i) => (
                    <li key={i}>
                      <Link
                        href={withUtm(l.url, "whats_new")}
                        className="underline text-blue-700"
                        target={l.url.startsWith("http") ? "_blank" : undefined}
                      >
                        {l.title || l.url}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
