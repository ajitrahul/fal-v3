// app/newsletter/page.tsx
import type { Metadata } from "next";
import NewsletterForm from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Newsletter — FindAIList",
  description: "Daily/weekly digest of new and notable AI tools with concise summaries. No hype.",
  alternates: { canonical: "/newsletter" },
  openGraph: {
    title: "Newsletter — FindAIList",
    description: "Daily/weekly digest of new and notable AI tools with concise summaries. No hype.",
    url: "/newsletter",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Newsletter — FindAIList" },
};

export default function NewsletterPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Subscribe to the FindAIList newsletter</h1>
        <p className="text-gray-600">
          A concise daily or weekly roundup of new AI tools, notable updates, and editor’s picks.
        </p>
      </header>

      <div className="rounded-xl border bg-white p-4">
        <NewsletterForm source="newsletter_page" />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What you’ll get</h2>
        <ul className="list-disc pl-5 text-gray-800 space-y-1">
          <li>Top new tools with one-line TL;DRs</li>
          <li>Meaningful updates and pricing changes</li>
          <li>Occasional deep dives—no fluff</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sample issue (excerpt)</h2>
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div>
            <div className="font-medium">Perplexity adds Projects</div>
            <p className="text-sm text-gray-700">
              Structured research workspaces with citations. Good for multi-day briefs.
            </p>
          </div>
          <div>
            <div className="font-medium">Cursor ships new refactor tools</div>
            <p className="text-sm text-gray-700">
              Safer batch edits with previews and inline tests.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            You’ll receive a compact summary like this with links, daily or weekly.
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        We use a privacy-first approach. Unsubscribe anytime. No spam.
      </p>
    </div>
  );
}
