// components/CommentsWidget.tsx
"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  slug: string;
  author: string;
  text: string;
  rating: number | null;
  created_at: string;
};

export default function CommentsWidget({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | "">("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await res.json();
      setList(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: author.trim(),
          text: text.trim(),
          rating: rating === "" ? null : rating,
        }),
      });
      if (res.ok) {
        setAuthor("");
        setText("");
        setRating("");
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to post comment");
      }
    } catch {
      alert("Network error");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
            className="rounded-md border px-3 py-2 text-sm"
            maxLength={80}
            required
            aria-label="Your name"
          />
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value ? Number(e.target.value) : "")}
            className="rounded-md border px-3 py-2 text-sm"
            aria-label="Rating"
          >
            <option value="">No rating</option>
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★☆ (4)</option>
            <option value="3">★★★☆☆ (3)</option>
            <option value="2">★★☆☆☆ (2)</option>
            <option value="1">★☆☆☆☆ (1)</option>
          </select>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your experience…"
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={4}
          maxLength={4000}
          required
          aria-label="Comment text"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-black text-white text-sm px-3 py-2 hover:opacity-90"
          >
            Post comment
          </button>
          <span className="text-xs text-gray-500">
            Be constructive. No spam or personal info.
          </span>
        </div>
      </form>

      <div className="border-t pt-3">
        <div className="font-medium mb-2">
          {loading ? "Loading comments…" : `${list.length} comment${list.length === 1 ? "" : "s"}`}
        </div>
        <div className="space-y-3">
          {list
            .slice()
            .reverse()
            .map((c) => (
              <div key={c.id} className="rounded-lg border p-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{c.author}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                {c.rating ? (
                  <div className="text-xs text-amber-600 mt-1">
                    {"★".repeat(c.rating)}{" "}
                    <span className="text-gray-500">
                      {"☆".repeat(5 - c.rating)}
                    </span>
                  </div>
                ) : null}
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          {!loading && list.length === 0 ? (
            <div className="text-sm text-gray-600">No comments yet. Be the first to share.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
