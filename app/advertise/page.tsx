// app/advertise/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sponsor & Advertise — FindAIList",
  description: "Non-intrusive placements across the directory, category hubs, and newsletter.",
  alternates: { canonical: "/advertise" }
};

export default function AdvertisePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Sponsor & Advertise</h1>
        <p className="text-gray-600">
          Reach teams actively evaluating AI tools. Clean placements, clear labels, no dark patterns.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm font-semibold">Homepage hero</div>
          <p className="text-sm text-gray-700 mt-1">
            Prominent unit on the homepage. Great for launches and brand lifts.
          </p>
          <ul className="mt-2 text-xs text-gray-600 list-disc pl-5">
            <li>970×250 image</li>
            <li>1 slot / day</li>
            <li>UTM tagged</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm font-semibold">Category sidebar</div>
          <p className="text-sm text-gray-700 mt-1">
            Native unit across specific category hubs (e.g., Image, Code, Video).
          </p>
          <ul className="mt-2 text-xs text-gray-600 list-disc pl-5">
            <li>300×250 image</li>
            <li>Contextual placement</li>
            <li>UTM tagged</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm font-semibold">Tool footer</div>
          <p className="text-sm text-gray-700 mt-1">
            Lightweight banner below tool details—ideal for high-intent audiences.
          </p>
          <ul className="mt-2 text-xs text-gray-600 list-disc pl-5">
            <li>728×90 image</li>
            <li>Visible on engaged sessions</li>
            <li>UTM tagged</li>
          </ul>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 space-y-2">
        <div className="text-sm font-semibold">Process</div>
        <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
          <li>Pick placement + dates</li>
          <li>Share creative assets (PNG/JPG, fallback text)</li>
          <li>We schedule and confirm</li>
          <li>Receive a simple performance report</li>
        </ol>
        <p className="text-xs text-gray-600">
          To get started, email <a className="underline" href="mailto:ads@findailist.com">ads@findailist.com</a>.
        </p>
      </section>

      <p className="text-xs text-gray-500">
        All paid units are clearly labeled “Sponsored”. We don’t sell user data and we never block content behind ads.
      </p>

      <div className="text-sm">
        <Link className="underline" href="/whats-new">See what’s new</Link> ·{" "}
        <Link className="underline" href="/newsletter">Newsletter</Link>
      </div>
    </div>
  );
}
