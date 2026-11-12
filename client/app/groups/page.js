"use client";

// Groups: your groups + discover/search all groups.
//   GET /api/groups/mine     GET /api/groups?q=...
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import GroupCard from "@/components/GroupCard";

export default function GroupsPage() {
  const { user, loading } = useAuth();
  const [mine, setMine] = useState(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return setMine([]);
    api("/api/groups/mine")
      .then((d) => setMine(d.groups))
      .catch(() => setMine([]));
  }, [user, loading]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      api(`/api/groups?q=${encodeURIComponent(query)}`)
        .then((d) => setGroups(d.groups))
        .catch(() => setGroups([]));
    }, 300); // debounce, like the People search
    return () => clearTimeout(t);
  }, [query, loading, user?.id]);

  // Discover = groups you're not in yet. (A search still finds your own groups too.)
  const myIds = new Set((mine ?? []).map((g) => g.id));
  const shown = query.trim() ? groups : groups?.filter((g) => !myIds.has(g.id));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Groups</h1>
        {user && (
          <Link href="/groups/new" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            + Create group
          </Link>
        )}
      </div>

      {user && mine?.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">Your groups</h2>
          <ul className="mt-2 divide-y divide-line">
            {mine.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">Discover</h2>
        <label htmlFor="group-search" className="sr-only">
          Search groups
        </label>
        <input
          id="group-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groups"
          className="mt-2 w-full rounded-lg border border-line-strong bg-transparent px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
        />
        {!shown && <p className="mt-6 opacity-60">Loading…</p>}
        {shown?.length === 0 && (
          <p className="mt-8 text-center opacity-60">
            {query.trim()
              ? `No groups match “${query.trim()}”.`
              : groups.length > 0
                ? "You're in every group so far. Create a new one!"
                : "No groups yet. Create the first one!"}
          </p>
        )}
        <ul className="mt-2 divide-y divide-line">
          {shown?.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </ul>
      </section>
    </main>
  );
}
