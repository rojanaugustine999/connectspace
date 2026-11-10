"use client";

// Followers / Following list with page numbers (offset pagination: ?page=1, ?page=2 ...).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import UserCard from "@/components/UserCard";

export default function ConnectionsList({ type }) {
  const { username } = useParams();
  const { loading: authLoading, user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    setData(null);
    setError("");
    api(`/api/users/${username}/${type}?page=${page}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [username, type, page, authLoading, me?.id]);

  const tabClass = (active) =>
    `flex-1 border-b-2 py-3 text-center font-medium ${
      active ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100"
    }`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
      <Link href={`/u/${username}`} className="text-sm opacity-70 hover:underline">
        ← @{username}
      </Link>

      <div className="mt-4 flex border-b border-black/10 dark:border-white/10">
        <Link href={`/u/${username}/followers`} className={tabClass(type === "followers")}>
          Followers
        </Link>
        <Link href={`/u/${username}/following`} className={tabClass(type === "following")}>
          Following
        </Link>
      </div>

      {error && <p className="mt-6 text-red-600">{error}</p>}
      {!data && !error && <p className="mt-6 opacity-60">Loading…</p>}

      {data && data.users.length === 0 && (
        <p className="mt-8 text-center opacity-60">
          {type === "followers" ? `No one follows @${username} yet.` : `@${username} isn't following anyone yet.`}
        </p>
      )}

      {data && data.users.length > 0 && (
        <>
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {data.users.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </ul>

          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="underline disabled:opacity-30">
                ← Previous
              </button>
              <span className="opacity-60">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
                className="underline disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
