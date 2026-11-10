"use client";

// Notifications: GET /api/notifications, then PATCH /api/notifications/read.
// The data comes from MongoDB (the notifications) + PostgreSQL (who did it), merged by the API.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useSocketEvent } from "@/lib/socket-context";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";

const MESSAGES = {
  follow: "started following you",
  like: "liked your post",
  comment: "commented on your post",
  message: "sent you a message",
};

export default function NotificationsPage() {
  const { user, loading } = useRequireAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api("/api/notifications")
      .then(async (data) => {
        setItems(data.notifications); // show them with their unread dots first...
        if (data.unreadCount > 0) {
          await api("/api/notifications/read", { method: "PATCH" }); // ...then mark them read on the server
          window.dispatchEvent(new Event("notifications:read")); // tell the nav bar to clear its badge
        }
      })
      .catch((err) => setError(err.message));
  }, [user]);

  // Week 6: new notifications appear at the top while this page is open.
  useSocketEvent("notification:new", ({ notification }) => {
    setItems((prev) => [notification, ...(prev ?? []).filter((n) => n.id !== notification.id)]);
    api("/api/notifications/read", { method: "PATCH" }).catch(() => {}); // you're looking at it, so it's read
  });

  if (loading || !user) return <p className="p-8 text-center opacity-60">Loading…</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {error && <p className="mt-6 text-red-600">{error}</p>}
      {!items && !error && <p className="mt-6 opacity-60">Loading…</p>}
      {items?.length === 0 && (
        <p className="mt-10 text-center opacity-60">
          Nothing yet. When someone follows you, you&apos;ll see it here.
        </p>
      )}

      {items?.length > 0 && (
        <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
          {items.map((n) => (
            <li key={n.id} className={`flex items-center gap-3 py-3 ${n.isRead ? "" : "font-medium"}`}>
              <Link href={`/u/${n.actor.username}`} className="shrink-0">
                <Avatar user={n.actor} />
              </Link>
              <p className="min-w-0 flex-1">
                <Link href={`/u/${n.actor.username}`} className="font-semibold hover:underline">
                  {n.actor.name}
                </Link>{" "}
                {n.postId ? (
                  <Link href={`/p/${n.postId}`} className={`hover:underline ${n.isRead ? "opacity-80" : ""}`}>
                    {MESSAGES[n.type]}
                  </Link>
                ) : (
                  <span className={n.isRead ? "opacity-80" : ""}>{MESSAGES[n.type]}</span>
                )}
                <span className="block text-sm font-normal opacity-60">{timeAgo(n.createdAt)}</span>
              </p>
              {!n.isRead && <span className="size-2.5 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
