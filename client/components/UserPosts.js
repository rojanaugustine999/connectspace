"use client";

// A user's posts on their profile. Same infinite scroll as the home feed.
import InfinitePostList from "@/components/InfinitePostList";

export default function UserPosts({ username, isMe, viewerKey }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Posts</h2>
      <div className="mt-3">
        <InfinitePostList
          endpoint={`/api/users/${username}/posts`}
          showComposer={isMe}
          viewerKey={viewerKey}
          empty={
            <p className="py-8 text-center opacity-60">{isMe ? "Write your first post above." : "No posts yet."}</p>
          }
        />
      </div>
    </section>
  );
}
