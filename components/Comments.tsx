// components/Comments.tsx
"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  slug: string;
  name: string;
  body: string;
  rating?: number;
  created_at: string;
};

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) setComments(json.comments || []);
    } catch (e: any) {
      setErr("Failed to load comments");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "",
          body: body || "",
          rating: rating,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to add comment");
      }
      setMsg("Thanks! Your comment is now visible.");
      setName("");
      setBody("");
      setRating(undefined);
      setComments((prev) => [json.comment, ...prev]);
    } catch (e: any) {
      setErr(e?.message || "Failed to add comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Comments</h2>

      <form onSubmit={onSubmit} className="space-y-2 rounded-lg border bg-white p-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Your name"
              required
              minLength={2}
              maxLength={60}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Rating (optional)</label>
            <select
              value={rating ?? ""}
              onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">No rating</option>
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Comment</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            rows={4}
            placeholder="Be helpful and specific. What worked well? What could be better?"
            required
            minLength={5}
            maxLength={4000}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-black text-white text-sm px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Posting…" : "Post comment"}
          </button>
          {msg ? <div className="text-xs text-green-700">{msg}</div> : null}
          {err ? <div className="text-xs text-red-600">{err}</div> : null}
        </div>
      </form>

      <div className="space-y-2">
        {comments.length === 0 ? (
          <div className="text-sm text-gray-700">No comments yet.</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{c.name}</div>
                {typeof c.rating === "number" ? (
                  <div className="text-xs text-amber-600">{`★`.repeat(c.rating)}{`☆`.repeat(5 - c.rating)}</div>
                ) : null}
              </div>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{c.body}</p>
              <div className="text-[11px] text-gray-500 mt-1">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
