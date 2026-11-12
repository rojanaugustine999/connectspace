"use client";

// Two-pane layout for /messages and /messages/<id>:
//   desktop → chat list on the left, open chat on the right
//   phone   → list only on /messages, chat only on /messages/<id>
import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import ConversationList from "@/components/ConversationList";

export default function MessagesLayout({ children }) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();
  const inChat = pathname !== "/messages";

  if (loading || !user) return <p className="p-8 text-center opacity-60">Loading…</p>;

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-5xl font-sans md:border-x md:border-line">
      <aside
        className={`w-full shrink-0 overflow-y-auto border-line md:block md:w-80 md:border-r ${
          inChat ? "hidden" : "block"
        }`}
      >
        <h1 className="px-4 pb-2 pt-4 text-xl font-bold">Messages</h1>
        <ConversationList />
      </aside>
      <section className={`min-w-0 flex-1 ${inChat ? "flex" : "hidden md:flex"}`}>{children}</section>
    </div>
  );
}
