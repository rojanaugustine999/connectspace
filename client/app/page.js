"use client";

// Home page.
//   Logged in  → your feed:  GET /api/posts/feed     (people you follow + you)
//   Logged out → explore:    GET /api/posts/explore  (everyone's latest posts)
import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import InfinitePostList from "@/components/InfinitePostList";

function EmptyFeed() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
      <h2 className="font-semibold">Your feed is empty</h2>
      <p className="mt-1 text-sm opacity-70">Follow people to see their posts here, or write your first post above.</p>
      <Link
        href="/search"
        className="mt-4 inline-block rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-hover"
      >
        Find people to follow
      </Link>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [followingCount, setFollowingCount] = useState(null);
  const onFirstPage = useCallback((data) => setFollowingCount(data.followingCount ?? null), []);

  if (loading) return <p className="p-8 text-center opacity-60">Loading…</p>;

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
        <section className="rounded-2xl bg-brand px-6 py-8 text-white">
          <h1 className="text-3xl font-bold">Welcome to ConnectSpace</h1>
          <p className="mt-2 max-w-md opacity-90">Follow people, share posts and join the conversation.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-white px-5 py-2 font-medium text-blue-700 hover:bg-blue-50">
              Sign up
            </Link>
            <Link href="/login" className="rounded-full border border-white/60 px-5 py-2 font-medium hover:bg-white/10">
              Log in
            </Link>
          </div>
        </section>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide opacity-60">Latest posts</h2>
        <InfinitePostList endpoint="/api/posts/explore" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">Home</h1>
        {followingCount !== null && (
          <Link href={`/u/${user.username}/following`} className="text-sm opacity-60 hover:underline">
            Following {followingCount} {followingCount === 1 ? "person" : "people"}
          </Link>
        )}
      </div>
      <InfinitePostList
        endpoint="/api/posts/feed"
        showComposer
        viewerKey={user.id}
        onFirstPage={onFirstPage}
        empty={<EmptyFeed />}
      />
    </main>
  );
}
