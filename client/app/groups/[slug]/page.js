"use client";

// A group's posts. Private groups show a lock screen to non-members.
//   GET /api/groups/:slug/posts     POST /api/groups/:slug/posts
import { useAuth } from "@/lib/auth-context";
import InfinitePostList from "@/components/InfinitePostList";
import { useGroup } from "@/lib/group-context";

export default function GroupPostsPage() {
  const { group } = useGroup();
  const { user } = useAuth();

  if (!group.canView) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 dark:border-white/20 p-8 text-center">
        <p className="text-3xl" aria-hidden>
          🔒
        </p>
        <h2 className="mt-2 font-semibold">This group is private</h2>
        <p className="mt-1 text-sm opacity-70">
          {group.myStatus === "PENDING"
            ? "Your request is waiting for an admin to approve it."
            : "Request to join to see what members are posting."}
        </p>
      </div>
    );
  }

  const isMember = group.myStatus === "ACTIVE";
  return (
    <InfinitePostList
      endpoint={`/api/groups/${group.slug}/posts`}
      viewerKey={`${user?.id}-${group.myStatus}`}
      showComposer={isMember}
      composerEndpoint={`/api/groups/${group.slug}/posts`}
      composerPlaceholder={`Post to ${group.name}`}
      showGroup={false}
      empty={
        <p className="py-8 text-center opacity-60">
          {isMember ? "No posts yet. Start the conversation above!" : "No posts yet. Join to start the conversation."}
        </p>
      }
    />
  );
}
