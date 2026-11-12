"use client";

// "Message" on a profile: POST /api/conversations { username } → open (or create) the chat.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function MessageButton({ username }) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!user || user.username === username) return null;

  async function open() {
    setBusy(true);
    try {
      const { conversation } = await api("/api/conversations", { method: "POST", body: { username } });
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={busy}
      className="rounded-full border border-field px-5 py-2 font-medium hover:bg-subtle disabled:opacity-50"
    >
      {busy ? "Opening…" : "Message"}
    </button>
  );
}
