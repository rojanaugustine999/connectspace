"use client";

// One open chat.
//   History:  GET /api/conversations/:id/messages   (REST, with "Load older")
//   Send:     socket.emit("message:send")           (REST fallback if the socket is down)
//   Live:     "message:new", "typing", "messages:read" socket events
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocket, useSocketEvent } from "@/lib/socket-context";
import Avatar from "@/components/Avatar";

const TYPING_SEND_EVERY = 2000; // ms between "I'm typing" signals while you keep typing
const TYPING_STOP_AFTER = 2500; // ms of no typing before we send "stopped typing"

function timeOf(date) {
  return new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ChatWindow({ conversationId }) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [olderCursor, setOlderCursor] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);

  const listRef = useRef(null);
  const stickToBottom = useRef(true); // auto-scroll only if you're already near the bottom
  const restoreScrollFrom = useRef(null); // keeps your place after "Load older"
  const typingSentAt = useRef(0);
  const stopTypingTimer = useRef(null);
  const otherTypingTimer = useRef(null);

  const markRead = useCallback(() => {
    if (socket?.connected) socket.emit("messages:read", { conversationId });
    else api(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
  }, [socket, conversationId]);

  // ---- load the chat ----
  useEffect(() => {
    let cancelled = false;
    Promise.all([api(`/api/conversations/${conversationId}`), api(`/api/conversations/${conversationId}/messages`)])
      .then(([c, m]) => {
        if (cancelled) return;
        setConversation(c.conversation);
        setMessages(m.messages);
        setOlderCursor(m.nextCursor);
        setStatus("ready");
      })
      .catch((err) => !cancelled && setStatus(err.status === 404 ? "notfound" : "error"));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Mark as read once loaded (and again whenever the socket (re)connects).
  useEffect(() => {
    if (status === "ready") markRead();
  }, [status, markRead]);

  // ---- live events ----
  useSocketEvent("message:new", ({ message, clientId }) => {
    if (message.conversationId !== conversationId) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev; // already have it
      if (clientId && prev.some((m) => m.id === clientId)) {
        return prev.map((m) => (m.id === clientId ? message : m)); // our "sending…" bubble → saved message
      }
      return [...prev, message];
    });
    if (message.senderId !== user.id) {
      setOtherTyping(false);
      if (document.visibilityState === "visible") markRead();
    }
  });

  useSocketEvent("typing", ({ conversationId: cid, isTyping }) => {
    if (cid !== conversationId) return;
    setOtherTyping(isTyping);
    clearTimeout(otherTypingTimer.current);
    // Safety net: if the "stopped typing" signal never arrives (closed tab), hide it anyway.
    if (isTyping) otherTypingTimer.current = setTimeout(() => setOtherTyping(false), 5000);
  });

  useSocketEvent("messages:read", ({ conversationId: cid, userId }) => {
    if (cid !== conversationId || userId === user.id) return;
    setMessages((prev) =>
      prev.map((m) => (m.senderId === user.id && !m.readBy?.includes(userId) ? { ...m, readBy: [...(m.readBy ?? []), userId] } : m))
    );
  });

  useEffect(() => () => {
    clearTimeout(stopTypingTimer.current);
    clearTimeout(otherTypingTimer.current);
  }, []);

  // ---- scrolling ----
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (restoreScrollFrom.current !== null) {
      el.scrollTop = el.scrollHeight - restoreScrollFrom.current; // stay where you were after loading older
      restoreScrollFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, otherTyping]);

  function handleScroll() {
    const el = listRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await api(`/api/conversations/${conversationId}/messages?cursor=${encodeURIComponent(olderCursor)}`);
      restoreScrollFrom.current = listRef.current.scrollHeight;
      setMessages((prev) => [...data.messages, ...prev]);
      setOlderCursor(data.nextCursor);
    } finally {
      setLoadingOlder(false);
    }
  }

  // ---- typing + sending ----
  function sendTyping(isTyping) {
    if (socket?.connected) socket.emit("typing", { conversationId, isTyping });
  }

  function handleChange(e) {
    setText(e.target.value);
    const now = Date.now();
    if (now - typingSentAt.current > TYPING_SEND_EVERY) {
      sendTyping(true);
      typingSentAt.current = now;
    }
    clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      sendTyping(false);
      typingSentAt.current = 0;
    }, TYPING_STOP_AFTER);
  }

  function replacePending(tempId, saved) {
    setMessages((prev) =>
      prev.some((m) => m.id === saved.id) ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? saved : m))
    );
  }

  function markFailed(tempId, error) {
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: error } : m)));
  }

  function send(content, tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
    // 1. Show it immediately as "sending…"
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== tempId),
      { id: tempId, senderId: user.id, text: content, readBy: [user.id], createdAt: new Date().toISOString(), pending: true },
    ]);
    stickToBottom.current = true;

    // 2. Send it: socket if connected, otherwise plain REST.
    if (socket?.connected) {
      socket.timeout(10000).emit("message:send", { conversationId, text: content, clientId: tempId }, (err, res) => {
        if (err) markFailed(tempId, "No answer from the server");
        else if (!res.ok) markFailed(tempId, res.error);
        else replacePending(tempId, res.message);
      });
    } else {
      api(`/api/conversations/${conversationId}/messages`, { method: "POST", body: { text: content } })
        .then(({ message }) => replacePending(tempId, message))
        .catch((err) => markFailed(tempId, err.message));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    clearTimeout(stopTypingTimer.current);
    sendTyping(false);
    typingSentAt.current = 0;
    send(content);
  }

  // ---- render ----
  if (status === "loading") return <p className="m-auto opacity-60">Loading chat…</p>;
  if (status === "notfound") {
    return (
      <div className="m-auto p-8 text-center">
        <p className="font-semibold">Chat not found</p>
        <Link href="/messages" className="mt-2 inline-block underline">
          Back to messages
        </Link>
      </div>
    );
  }
  if (status === "error") return <p className="m-auto text-red-600">Could not load this chat.</p>;

  const other = conversation.otherUser;
  const lastMine = [...messages].reverse().find((m) => m.senderId === user.id && !m.pending && !m.failed);
  const seen = lastMine?.readBy?.includes(other.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-3 py-2">
        <Link href="/messages" className="rounded-lg px-2 py-1 text-lg md:hidden" aria-label="Back to messages">
          ←
        </Link>
        <Link href={`/u/${other.username}`} className="flex min-w-0 items-center gap-3 hover:underline">
          <Avatar user={other} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{other.name}</p>
            <p className="truncate text-xs opacity-60">@{other.username}</p>
          </div>
        </Link>
        {!connected && (
          <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
            Reconnecting…
          </span>
        )}
      </header>

      <div ref={listRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        {olderCursor && (
          <div className="mb-4 text-center">
            <button onClick={loadOlder} disabled={loadingOlder} className="text-sm underline opacity-70 hover:opacity-100">
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="mt-10 flex flex-col items-center text-center opacity-70">
            <Avatar user={other} size="lg" />
            <p className="mt-3 font-semibold">{other.name}</p>
            <p className="text-sm">Say hi 👋</p>
          </div>
        )}

        <ul className="space-y-1.5">
          {messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 ${
                    mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-black/5 dark:bg-white/10"
                  } ${m.pending ? "opacity-60" : ""} ${m.failed ? "bg-red-600" : ""}`}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 px-1 text-[11px] opacity-50">
                  {m.pending ? "Sending…" : m.failed ? null : timeOf(m.createdAt)}
                  {m.id === lastMine?.id && seen && " · Seen"}
                </span>
                {m.failed && (
                  <p className="px-1 text-xs text-red-600 dark:text-red-400">
                    Not sent: {m.failed}.{" "}
                    <button onClick={() => send(m.text, m.id)} className="font-semibold underline">
                      Retry
                    </button>
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {otherTyping && (
          <p className="mt-2 flex items-center gap-2 text-sm opacity-60">
            <span className="flex gap-0.5" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
            </span>
            {other.name} is typing…
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-black/10 dark:border-white/10 p-3">
        <label htmlFor="message" className="sr-only">
          Message {other.name}
        </label>
        <textarea
          id="message"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleSubmit(e); // Enter sends, Shift+Enter = new line
          }}
          maxLength={2000}
          placeholder={`Message ${other.name}`}
          className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-black/15 dark:border-white/20 bg-transparent px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
