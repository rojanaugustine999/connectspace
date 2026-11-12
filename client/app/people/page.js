"use client";

// Find people: GET /api/users/search?q=...
// "Debounce": wait until the user stops typing for 300 ms before calling the API,
// instead of sending one request per key press.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import UserCard from "@/components/UserCard";

export default function PeoplePage() {
  const { loading: authLoading, user: me } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => {
      api(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((d) => {
          setUsers(d.users);
          setError("");
        })
        .catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(timer); // typed again within 300 ms → cancel the previous timer
  }, [query, authLoading, me?.id]);

  const others = users?.filter((u) => u.id !== me?.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
      <h1 className="text-2xl font-bold">People</h1>
      <p className="mt-1 text-sm opacity-70">Find people to follow.</p>

      <label htmlFor="search" className="sr-only">
        Search people
      </label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or @username"
        className="mt-4 w-full rounded-lg border border-line-strong bg-transparent px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
      />

      {error && <p className="mt-6 text-danger">{error}</p>}
      {!others && !error && <p className="mt-6 opacity-60">Loading…</p>}
      {others?.length === 0 && <p className="mt-8 text-center opacity-60">No one found for “{query}”.</p>}

      {others?.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide opacity-60">
            {query.trim() ? "Results" : "Newest members"}
          </h2>
          <ul className="divide-y divide-line">
            {others.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
