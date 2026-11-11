"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocketEvent } from "@/lib/socket-context";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";

function Badge({ count }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs leading-5 text-white">
      <span className="sr-only">, </span>
      {count > 9 ? "9+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

// Line icons for the phone nav (the text labels show from the "sm" breakpoint up).
// Same 2px stroke style as the like/comment icons, so the UI uses one icon language.
const ICONS = {
  people: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  groups: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6.5 6.5 0 0 1 3 6" />
    </>
  ),
  messages: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  notifications: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
};

function NavIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 sm:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

function NavLink({ href, children, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-lg px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 ${
        active ? "" : "opacity-70"
      }`}
    >
      {children}
    </Link>
  );
}

export default function NavBar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Load both counts once when you log in (or reload the page).
  // After that, Socket.io events keep them up to date, so there's no need to poll.
  const refreshNotifications = useCallback(() => {
    if (!user) return setUnread(0);
    api("/api/notifications/unread-count")
      .then((d) => setUnread(d.unreadCount))
      .catch(() => {});
  }, [user]);

  const refreshMessages = useCallback(() => {
    if (!user) return setUnreadMessages(0);
    api("/api/conversations/unread-count")
      .then((d) => setUnreadMessages(d.unreadCount))
      .catch(() => {});
  }, [user]);

  useEffect(refreshNotifications, [refreshNotifications]);
  useEffect(refreshMessages, [refreshMessages]);

  // Live updates pushed by the server:
  useSocketEvent("notification:new", () => {
    if (pathname !== "/notifications") setUnread((n) => n + 1);
  });
  useSocketEvent("message:new", ({ message }) => {
    if (message.senderId === user?.id) return;
    // If that chat is open on screen, ChatWindow marks it read straight away, so don't count it.
    if (pathname !== `/messages/${message.conversationId}`) setUnreadMessages((n) => n + 1);
  });
  useSocketEvent("messages:read", ({ userId }) => {
    if (userId === user?.id) refreshMessages(); // I read a chat (in this tab or another one)
  });

  // The notifications page sends this event after marking everything as read.
  useEffect(() => {
    window.addEventListener("notifications:read", refreshNotifications);
    return () => window.removeEventListener("notifications:read", refreshNotifications);
  }, [refreshNotifications]);

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-black/10 dark:border-white/10 bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-3xl items-center gap-1 px-4">
        <Link href="/" aria-label="ConnectSpace home" className="mr-auto rounded-lg">
          {/* On phones only the icon shows, to leave room for the nav links. */}
          <Logo wordmark="responsive" />
        </Link>

        <NavLink href="/people" active={pathname === "/people"}>
          <span className="sr-only sm:not-sr-only">People</span>
          <NavIcon name="people" />
        </NavLink>
        <NavLink href="/groups" active={pathname.startsWith("/groups")}>
          <span className="sr-only sm:not-sr-only">Groups</span>
          <NavIcon name="groups" />
        </NavLink>

        {!loading && user && (
          <>
            <NavLink href="/messages" active={pathname.startsWith("/messages")}>
              <span className="sr-only sm:not-sr-only">Messages</span>
              <NavIcon name="messages" />
              <Badge count={unreadMessages} />
            </NavLink>
            <NavLink href="/notifications" active={pathname === "/notifications"}>
              <span className="sr-only sm:not-sr-only">Notifications</span>
              <NavIcon name="notifications" />
              <Badge count={unread} />
            </NavLink>
            <Link href={`/u/${user.username}`} className="ml-1 rounded-full" aria-label="Your profile">
              <Avatar user={user} size="sm" />
            </Link>
          </>
        )}

        {!loading && !user && (
          <Link href="/login" className="ml-1 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
