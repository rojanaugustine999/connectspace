"use client";

// Your chats, most recent first. Updates live: new messages move a chat to the top
// and bump its unread count.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocketEvent } from "@/lib/socket-context";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";

export default function ConversationList() {
  const { user } = useAuth();
  const { id: activeId } = useParams();
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api("/api/conversations")
      .then((d) => setConversations(d.conversations))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useSocketEvent("message:new", ({ message }) => {
    setConversations((prev) => {
      if (!prev) return prev;
      const existing = prev.find((c) => c.id === message.conversationId);
      if (!existing) {
        load(); // a brand-new chat someone started with us
        return prev;
      }
      const fromOther = message.senderId !== user.id;
      const updated = {
        ...existing,
        lastMessage: { text: message.text, senderId: message.senderId, at: message.createdAt },
        updatedAt: message.createdAt,
        unreadCount: fromOther && message.conversationId !== activeId ? existing.unreadCount + 1 : existing.unreadCount,
      };
      return [updated, ...prev.filter((c) => c.id !== existing.id)]; // move to top
    });
  });

  useSocketEvent("messages:read", ({ conversationId, userId }) => {
    if (userId !== user?.id) return;
    setConversations((prev) => prev?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
  });

  if (error) return <p className="p-4 text-danger">{error}</p>;
  if (!conversations) return <p className="p-4 opacity-60">Loading chats…</p>;

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm opacity-70">
        <p>No messages yet.</p>
        <p className="mt-1">
          Open someone&apos;s profile and tap <strong>Message</strong>, or{" "}
          <Link href="/search" className="underline">
            find people
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ul>
      {conversations.map((c) => {
        const active = c.id === activeId;
        const mine = c.lastMessage?.senderId === user?.id;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-subtle ${
                active ? "bg-subtle" : ""
              }`}
            >
              <Avatar user={c.otherUser} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate ${c.unreadCount ? "font-bold" : "font-semibold"}`}>{c.otherUser.name}</p>
                  {c.lastMessage && <span className="shrink-0 text-xs opacity-50">{timeAgo(c.lastMessage.at)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${c.unreadCount ? "font-medium" : "opacity-60"}`}>
                    {c.lastMessage ? `${mine ? "You: " : ""}${c.lastMessage.text}` : "Say hi 👋"}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-brand px-2 text-xs leading-5 text-white">
                      {c.unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
