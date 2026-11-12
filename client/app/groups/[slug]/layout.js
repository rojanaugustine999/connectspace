"use client";

// Shared by /groups/<slug>, /groups/<slug>/members and /groups/<slug>/settings:
// loads the group ONCE, shows the header (name, privacy, join button, tabs) and
// shares the group with the child pages through React context.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import GroupIcon from "@/components/GroupIcon";
import { PrivacyLabel } from "@/components/GroupCard";
import { GroupContext } from "@/lib/group-context";


function JoinButton({ group, onChange }) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (group.myRole === "OWNER") return null;

  async function act(method) {
    if (!user) return router.push("/login");
    if (method === "DELETE" && group.myStatus === "ACTIVE" && !window.confirm(`Leave ${group.name}?`)) return;
    setBusy(true);
    try {
      await api(`/api/groups/${group.slug}/join`, { method });
      await onChange();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  const base = "rounded-full px-5 py-2 font-medium disabled:opacity-50";
  if (group.myStatus === "ACTIVE") {
    return (
      <button onClick={() => act("DELETE")} disabled={busy} className={`${base} border border-field hover:border-danger hover:text-danger`}>
        Leave group
      </button>
    );
  }
  if (group.myStatus === "PENDING") {
    return (
      <button onClick={() => act("DELETE")} disabled={busy} className={`${base} border border-field`}>
        Cancel request
      </button>
    );
  }
  return (
    <button onClick={() => act("POST")} disabled={busy} className={`${base} bg-brand text-white hover:bg-brand-hover`}>
      {group.isPrivate ? "Request to join" : "Join group"}
    </button>
  );
}

export default function GroupLayout({ children }) {
  const { slug } = useParams();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState("loading");

  const reload = useCallback(
    () =>
      api(`/api/groups/${slug}`)
        .then(({ group }) => {
          setGroup(group);
          setStatus("ready");
        })
        .catch((err) => setStatus(err.status === 404 ? "notfound" : "error")),
    [slug]
  );

  useEffect(() => {
    if (!authLoading) reload();
  }, [reload, authLoading, user?.id]);

  if (status === "loading") return <p className="p-8 text-center opacity-60">Loading group…</p>;
  if (status === "notfound") {
    return (
      <main className="p-8 text-center">
        <h1 className="text-xl font-bold">Group not found</h1>
        <Link href="/groups" className="mt-4 inline-block underline">
          Browse groups
        </Link>
      </main>
    );
  }
  if (status === "error") return <p className="p-8 text-center text-danger">Could not load this group.</p>;

  const isAdmin = group.myRole === "OWNER" || group.myRole === "ADMIN";
  const tabs = [
    { href: `/groups/${slug}`, label: "Posts" },
    { href: `/groups/${slug}/members`, label: group.pendingCount ? `Members (${group.pendingCount} waiting)` : "Members" },
    ...(isAdmin ? [{ href: `/groups/${slug}/settings`, label: "Settings" }] : []),
  ];

  return (
    <GroupContext.Provider value={{ group, reload, isAdmin }}>
      <main className="mx-auto max-w-3xl px-4 py-6 font-sans">
        <Link href="/groups" className="text-sm opacity-70 hover:underline">
          ← Groups
        </Link>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <GroupIcon group={group} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold break-words">{group.name}</h1>
            <p className="text-sm">
              <PrivacyLabel isPrivate={group.isPrivate} />
              <span className="opacity-60">
                {" "}
                · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                {group.myRole && ` · You're ${group.myRole === "OWNER" ? "the owner" : group.myRole === "ADMIN" ? "an admin" : "a member"}`}
              </span>
            </p>
            {group.description && <p className="mt-2 whitespace-pre-line break-words">{group.description}</p>}
          </div>
          <JoinButton group={group} onChange={reload} />
        </div>

        <nav className="mt-6 flex overflow-x-auto border-b border-line" aria-label="Group sections">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-4 py-3 font-medium ${
                  active ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4">{children}</div>
      </main>
    </GroupContext.Provider>
  );
}
