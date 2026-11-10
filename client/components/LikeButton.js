"use client";

// Like / unlike with an optimistic update (same idea as FollowButton).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LikeButton({ postId, initialLiked, initialCount }) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) return router.push("/login");
    if (busy) return;

    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setBusy(true);
    try {
      const result = await api(`/api/posts/${postId}/like`, { method: next ? "POST" : "DELETE" });
      setCount(result.likeCount); // trust the server's number (someone else may have liked too)
    } catch {
      setLiked(!next); // undo
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={`Like, ${count} ${count === 1 ? "like" : "likes"}`}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-rose-500/10 ${
        liked ? "text-rose-600 dark:text-rose-400" : "opacity-70 hover:opacity-100"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
      </svg>
      <span aria-hidden>{count}</span>
    </button>
  );
}
