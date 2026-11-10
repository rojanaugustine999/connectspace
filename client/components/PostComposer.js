"use client";

// Write a new post: POST /api/posts
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";

const MAX = 2000;

export default function PostComposer({ onCreated, placeholder = "What's on your mind?" }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  if (!user) return null;

  const remaining = MAX - content.length;
  const canPost = content.trim().length > 0 && remaining >= 0 && !posting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canPost) return;
    setPosting(true);
    setError("");
    try {
      const { post } = await api("/api/posts", { method: "POST", body: { content } });
      setContent("");
      onCreated?.(post);
    } catch (err) {
      setError(err.details?.content || err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3 rounded-xl border border-black/10 dark:border-white/15 p-4"
    >
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <label htmlFor="new-post" className="sr-only">
          New post
        </label>
        <textarea
          id="new-post"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(e); // Ctrl+Enter posts
          }}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:opacity-50"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-2 flex items-center justify-end gap-3">
          {content.length > MAX - 200 && (
            <span className={`text-sm ${remaining < 0 ? "text-red-600" : "opacity-60"}`}>{remaining}</span>
          )}
          <button
            type="submit"
            disabled={!canPost}
            className="rounded-full bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
