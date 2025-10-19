// app/submit/page.tsx
"use client";

import { useEffect, useState } from "react";

type Mode = "add" | "edit";

export default function SubmitPage() {
  const [mode, setMode] = useState<Mode>("add");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [json, setJson] = useState<string>("{\n  \n}");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const m = sp.get("mode");
      if (m === "edit") setMode("edit");
    } catch {}
  }, []);

  async function loadExisting() {
    setMsg(null);
    if (!slug.trim()) {
      setMsg("Enter a slug to load existing tool JSON.");
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`/api/tools/${encodeURIComponent(slug.trim())}`);
      if (!res.ok) {
        setMsg("Tool not found or cannot be loaded.");
        return;
      }
      const data = await res.json();
      setJson(JSON.stringify(data, null, 2));
      setMsg("Loaded existing JSON. Review, modify, and submit.");
    } catch {
      setMsg("Failed to load tool JSON.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setMsg(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setMsg("Please enter a valid E-Mail address (required).");
      return;
    }
    let payload: any;
    try {
      payload = JSON.parse(json);
    } catch {
      setMsg("Your JSON is invalid. Please fix it before submitting.");
      return;
    }
    try {
      setBusy(true);
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          email: email.trim(),
          slug: slug.trim() || (payload?.slug ?? ""),
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Submission failed.");
        return;
      }
      setMsg("Thanks! Your submission is pending admin review. You’ll be emailed once it’s approved.");
    } catch {
      setMsg("Network error while submitting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-xl font-semibold">Submit / Edit Tool</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-zinc-400">
        Provide your <strong>E-Mail</strong> (required). Tool JSON must follow{" "}
        <code>/schemas/tools-schema-2-updated.json</code>. Admin approval is required before
        changes go live; you’ll get a confirmation email on approval.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="add">Add New Tool</option>
            <option value="edit">Modify Existing Tool</option>
          </select>
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">E-Mail <span className="text-rose-600">*</span></span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            required
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">
            Slug {mode === "edit" ? <span className="text-rose-600">*</span> : <span className="text-gray-400">(optional)</span>}
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="tool-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            {mode === "edit" && (
              <button
                type="button"
                onClick={loadExisting}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                disabled={!slug || busy}
              >
                Load
              </button>
            )}
          </div>
        </label>
      </div>

      <label className="mb-2 block text-sm font-medium">Tool JSON (schema-aligned)</label>
      <textarea
        rows={20}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs leading-5 dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="{ ... }"
      />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Submitting..." : mode === "add" ? "Submit New Tool" : "Submit Modification"}
        </button>

        {msg && <p className="text-sm text-gray-700 dark:text-zinc-300">{msg}</p>}
      </div>
    </main>
  );
}
