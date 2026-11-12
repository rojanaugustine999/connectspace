"use client";

// A list of posts that loads the next page automatically when you scroll near the bottom.
// Used by the home feed, explore and profile pages, so they all paginate the same way.
//
// How infinite scroll works:
//   1. An invisible "sentinel" <div> sits under the last post.
//   2. An IntersectionObserver tells us when the sentinel comes near the screen.
//   3. Then we fetch  endpoint?cursor=<nextCursor>  and append the posts.
//   4. When the API says nextCursor = null, there's nothing more to load.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";

export default function InfinitePostList({
  endpoint,
  showComposer = false,
  composerEndpoint, // e.g. "/api/groups/kochi-designers/posts" (default: /api/posts)
  composerPlaceholder,
  showGroup = true,
  empty,
  viewerKey,
  onFirstPage,
}) {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | idle | more | error | done
  const sentinelRef = useRef(null);
  const busyRef = useRef(false); // stops two fetches running at once
  const requestRef = useRef(0); // ignores late responses from an old endpoint

  const fetchPage = useCallback(
    async (nextCursor) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const requestId = ++requestRef.current;
      setStatus(nextCursor ? "more" : "loading");
      try {
        const sep = endpoint.includes("?") ? "&" : "?";
        const data = await api(nextCursor ? `${endpoint}${sep}cursor=${encodeURIComponent(nextCursor)}` : endpoint);
        if (requestId !== requestRef.current) return; // a newer request replaced this one
        setPosts((prev) => (nextCursor ? [...prev, ...data.posts] : data.posts));
        setCursor(data.nextCursor);
        setStatus(data.nextCursor ? "idle" : "done");
        if (!nextCursor) onFirstPage?.(data);
      } catch {
        if (requestId === requestRef.current) setStatus("error");
      } finally {
        busyRef.current = false;
      }
    },
    [endpoint, onFirstPage]
  );

  // First page (and again if the endpoint or the logged-in user changes).
  useEffect(() => {
    busyRef.current = false;
    setPosts([]);
    setCursor(null);
    fetchPage(null);
  }, [fetchPage, viewerKey]);

  // Watch the sentinel: load the next page when it's within 600px of the screen.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor || status !== "idle") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchPage(cursor);
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, status, fetchPage]);

  const removePost = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div>
      {showComposer && (
        <div className="mb-2">
          <PostComposer
            endpoint={composerEndpoint}
            placeholder={composerPlaceholder}
            onCreated={(post) => setPosts((prev) => [post, ...prev])}
          />
        </div>
      )}

      {status === "loading" && (
        <div aria-busy="true" className="divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 py-4 animate-pulse">
              <div className="size-12 rounded-full bg-subtle-strong" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-1/3 rounded bg-subtle-strong" />
                <div className="h-3 w-full rounded bg-subtle-strong" />
                <div className="h-3 w-2/3 rounded bg-subtle-strong" />
              </div>
            </div>
          ))}
          <span className="sr-only">Loading posts…</span>
        </div>
      )}

      {status !== "loading" && posts.length === 0 && status !== "error" && empty}

      <div className="divide-y divide-line">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDeleted={removePost} showGroup={showGroup} />
        ))}
      </div>

      {/* The sentinel. The button is a fallback for keyboard users or if auto-loading misses. */}
      <div ref={sentinelRef} className="py-6 text-center text-sm">
        {status === "more" && <p className="opacity-60">Loading more…</p>}
        {status === "idle" && (
          <button onClick={() => fetchPage(cursor)} className="opacity-60 underline hover:opacity-100">
            Load more
          </button>
        )}
        {status === "error" && (
          <p className="text-danger">
            Couldn&apos;t load posts.{" "}
            <button onClick={() => fetchPage(posts.length ? cursor : null)} className="underline">
              Try again
            </button>
          </p>
        )}
        {status === "done" && posts.length > 0 && <p className="opacity-50">You&apos;re all caught up ✨</p>}
      </div>
    </div>
  );
}
