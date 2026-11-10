"use client";

import { useParams } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";

export default function ConversationPage() {
  const { id } = useParams();
  // key={id}: switching chats creates a fresh ChatWindow, so no state leaks between chats.
  return <ChatWindow key={id} conversationId={id} />;
}
