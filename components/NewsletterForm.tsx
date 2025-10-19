// components/NewsletterForm.tsx
"use client";

import { useState } from "react";

export default function NewsletterForm({ source = "newsletter_page" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, frequency, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("err");
        setMsg(data.error || "Subscription failed");
        return;
      }
      setStatus("ok");
      setMsg("You're on the list! Check your inbox for confirmation.");

      // GA4 event (if configured)
      // @ts-ignore
      if (typeof window !== "undefined" && window.gtag) {
        // @ts-ignore
        window.gtag("event", "newsletter_subscribed", {
          frequency,
          source,
        });
      }
      setEmail("");
    } catch {
      setStatus("err");
      setMsg("Network error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
        <input
          type="email"
          placeholder="you@example.com"
          className="rounded-md border px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Email address"
        />
        <select
          className="rounded-md border px-2 py-2 text-sm"
          value={frequency}
          onChange={(e) => setFrequency((e.target.value as "daily" | "weekly") || "daily")}
          aria-label="Frequency"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-black text-white text-sm px-4 py-2 hover:opacity-90"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {msg ? <p className={`text-sm ${status === "err" ? "text-red-600" : "text-green-700"}`}>{msg}</p> : null}
      <p className="text-xs text-gray-500">
        We use a privacy-first approach. Unsubscribe anytime.
      </p>
    </form>
  );
}
