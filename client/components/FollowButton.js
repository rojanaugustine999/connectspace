"use client";

// Follow / Following button with an "optimistic update":
// the button changes instantly, THEN we tell the server. If the server fails, we change it back.
// This makes the app feel fast, because the user doesn't wait for the network.
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function FollowButton({ username, initialFollowing, onChange, size = "md" }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sizeClass = size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2";

  if (!user) {
    return (
      <Link href="/login" className={`${sizeClass} rounded-full bg-brand text-white font-medium hover:bg-brand-hover`}>
        Follow
      </Link>
    );
  }
  if (user.username === username) return null;

  async function toggle() {
    const next = !following;
    setFollowing(next); // 1. update the UI right away
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/users/${username}/follow`, { method: next ? "POST" : "DELETE" }); // 2. tell the server
      onChange?.(result);
    } catch (err) {
      setFollowing(!next); // 3. it failed → undo
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={`Follow @${username}`}
        aria-pressed={following}
        className={`group ${sizeClass} min-w-24 rounded-full font-medium transition-colors disabled:opacity-60 ${
          following
            ? "border border-field hover:border-danger hover:text-danger"
            : "bg-foreground text-background hover:opacity-90"
        }`}
      >
        {following ? (
          // "Unfollow" only on mouse hover. Tailwind's hover styles only apply on devices with a real mouse,
          // so on phones a tap never leaves the button stuck showing "Unfollow".
          <>
            <span className="group-hover:hidden">Following</span>
            <span className="hidden group-hover:inline">Unfollow</span>
          </>
        ) : (
          "Follow"
        )}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
