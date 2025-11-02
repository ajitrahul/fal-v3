// components/CommentsSection.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Comment = {
  id: string;
  toolSlug: string;
  author?: string | null;
  body: string;
  createdAt: string;
};

export default function CommentsSection({ toolSlug }: { toolSlug: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function load(page = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?toolSlug=${encodeURIComponent(toolSlug)}&page=${page}&perPage=50`);
      if (!res.ok) throw new Error("Failed to load comments");
      const json = await res.json();
      setComments(json.comments ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!toolSlug) return;
    load();
  }, [toolSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!session) {
      setError("You must sign in to post a comment.");
      return;
    }
    if (!text.trim()) return setError("Please enter a comment");
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolSlug, body: text.trim() }),
      });
      if (res.status === 401) {
        // session might be stale - prompt sign in
        setError("Unauthorized — please sign in again.");
        setPosting(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error((j && j.error) || "Failed to post");
      }
      const j = await res.json();
      setText("");
      // prepend new comment
      setComments((c) => [j.comment, ...c]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section id="comments" className="mt-6 card p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Comments</h2>

      <div className="mt-3">
        {!session ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-zinc-400">Please sign in to post a comment.</div>
            <div>
              <button
                onClick={() => signIn("google")}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-1 space-y-2">
            <textarea
              placeholder="Write your comment..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={posting}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post comment"}
              </button>
              <button type="button" onClick={() => setText("")} className="text-sm text-gray-600 dark:text-zinc-300">
                Clear
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-zinc-400">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-zinc-400">No comments yet — be the first to comment.</div>
        ) : (
          <ul className="mt-2 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 bg-white border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{c.author ?? "Anonymous"}</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">{new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
