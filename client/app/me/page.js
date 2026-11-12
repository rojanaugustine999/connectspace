"use client";

// A protected page: only for logged-in users.
// The real protection is on the server (GET /api/auth/me needs a valid cookie).
// This redirect is only for a nice user experience.
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";

export default function MePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center font-sans opacity-70">Loading…</main>;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const joined = new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "long" });

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-line p-6">
        <div className="flex items-center gap-4">
          {/* The shared Avatar: shows the uploaded photo, or the same colour as everywhere else. */}
          <Avatar user={user} size="md" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <p className="text-sm opacity-70 truncate">@{user.username}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">Email</dt>
            <dd className="truncate">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-60">Joined</dt>
            <dd>{joined}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs opacity-60">
          This page loaded your data from <code>GET /api/auth/me</code> using your login cookie.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href={`/u/${user.username}`}
            className="flex-1 text-center rounded-lg border border-line-strong py-2.5 font-medium hover:bg-subtle"
          >
            View profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-lg bg-foreground text-background py-2.5 font-medium hover:opacity-90"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
