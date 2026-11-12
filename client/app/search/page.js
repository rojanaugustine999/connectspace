"use client";

// Search, with two tabs:
//   People → GET /api/users/search?q=…   (name or @username; empty search = newest members)
//   Posts  → GET /api/posts/search?q=…   (MongoDB text search, best match first, 10 per page)
// The search and tab live in the URL (/search?tab=posts&q=macaw), so results can be shared,
// bookmarked, and the Back button works.
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import UserCard from "@/components/UserCard";
import InfinitePostList from "@/components/InfinitePostList";

const TABS = [
  { id: "people", label: "People", placeholder: "Search by name or @username" },
  { id: "posts", label: "Posts", placeholder: "Search posts, e.g. coffee or design" },
];

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary so Next.js can pre-render the page shell.
  return (
    <Suspense fallback={<p className="p-8 text-center opacity-60">Loading…</p>}>
      <Search />
    </Suspense>
  );
}

function Search() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab") === "posts" ? "posts" : "people";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(query.trim());
  const tabRefs = useRef({});

  // "Debounce": wait until typing stops for 300 ms before searching, instead of one request per key press.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Keep the URL in step (replace, not push, so Back doesn't step through every letter).
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab === "posts") next.set("tab", "posts");
    if (debounced) next.set("q", debounced);
    const url = next.size ? `${pathname}?${next}` : pathname;
    if (url !== `${pathname}${params.size ? `?${params}` : ""}`) router.replace(url, { scroll: false });
  }, [debounced, tab, pathname, params, router]);

  function selectTab(id) {
    const next = new URLSearchParams(params);
    if (id === "posts") next.set("tab", "posts");
    else next.delete("tab");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  // Tabs pattern (WAI-ARIA): ←/→ move between tabs; Tab moves on into the results.
  function onTabKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const other = tab === "people" ? "posts" : "people";
    selectTab(other);
    tabRefs.current[other]?.focus();
  }

  const current = TABS.find((t) => t.id === tab);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
      <h1 className="text-2xl font-bold">Search</h1>

      <label htmlFor="search" className="sr-only">
        {current.placeholder}
      </label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={current.placeholder}
        maxLength={100}
        autoComplete="off"
        className="mt-4 w-full rounded-lg border border-line-strong bg-transparent px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
      />

      <div role="tablist" aria-label="What to search" className="mt-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[t.id] = el)}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => selectTab(t.id)}
            onKeyDown={onTabKeyDown}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              tab === t.id ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-2">
        {tab === "people" ? <PeopleResults query={debounced} /> : <PostResults query={debounced} />}
      </section>
    </main>
  );
}

function PeopleResults({ query }) {
  const { loading: authLoading, user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let current = true;
    api(`/api/users/search?q=${encodeURIComponent(query)}`)
      .then((d) => {
        if (!current) return; // an older search answered late
        setUsers(d.users);
        setError("");
      })
      .catch((err) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [query, authLoading, me?.id]);

  const others = users?.filter((u) => u.id !== me?.id);

  if (error) return <p className="mt-6 text-danger">{error}</p>;
  if (!others) return <p className="mt-6 opacity-60">Loading…</p>;
  if (others.length === 0) return <p className="mt-8 text-center opacity-60">No one found for “{query}”.</p>;
  return (
    <>
      <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide opacity-60">
        {query ? "Results" : "Newest members"}
      </h2>
      <ul className="divide-y divide-line">
        {others.map((u) => (
          <UserCard key={u.id} user={u} />
        ))}
      </ul>
    </>
  );
}

function PostResults({ query }) {
  const { user } = useAuth();

  if (query.length < 2) {
    return (
      <p className="mt-8 text-center opacity-60">
        Type at least 2 letters to search posts.
        <span className="mt-1 block text-sm">Tip: whole words work best, like “macaw” rather than “mac”.</span>
      </p>
    );
  }
  return (
    <div className="mt-2">
      <InfinitePostList
        endpoint={`/api/posts/search?q=${encodeURIComponent(query)}`}
        viewerKey={user?.id ?? "guest"}
        highlight={query}
        doneText="That's everything that matches."
        empty={
          <p className="mt-8 text-center opacity-60">
            No posts match “{query}”.
            <span className="mt-1 block text-sm">Try fewer words, or a whole word instead of part of one.</span>
          </p>
        }
      />
    </div>
  );
}
