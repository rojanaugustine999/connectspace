"use client";

// Members + (for admins) join requests.
//   GET    /api/groups/:slug/members[?status=PENDING]
//   POST   /api/groups/:slug/members/:userId/approve
//   PATCH  /api/groups/:slug/members/:userId  { role }   (owner only)
//   DELETE /api/groups/:slug/members/:userId             (remove / reject)
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useGroup } from "@/lib/group-context";
import Avatar from "@/components/Avatar";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: null };

function SmallButton({ children, danger, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-full border px-3 py-1 text-sm font-medium disabled:opacity-50 ${
        danger
          ? "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
          : "border-black/20 dark:border-white/25 hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function MemberRow({ member, actions }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Link href={`/u/${member.username}`} className="flex min-w-0 flex-1 items-center gap-3 group">
        <Avatar user={member} />
        <div className="min-w-0">
          <p className="truncate font-semibold group-hover:underline">
            {member.name}
            {ROLE_LABEL[member.role] && member.status === "ACTIVE" && (
              <span className="ml-2 rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                {ROLE_LABEL[member.role]}
              </span>
            )}
          </p>
          <p className="truncate text-sm opacity-60">@{member.username}</p>
        </div>
      </Link>
      {actions && <div className="flex gap-2">{actions}</div>}
    </li>
  );
}

export default function GroupMembersPage() {
  const { group, reload, isAdmin } = useGroup();
  const { user } = useAuth();
  const [members, setMembers] = useState(null);
  const [pending, setPending] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!group.canView) return;
    try {
      const [m, p] = await Promise.all([
        api(`/api/groups/${group.slug}/members`),
        isAdmin ? api(`/api/groups/${group.slug}/members?status=PENDING`) : { members: [] },
      ]);
      setMembers(m.members);
      setPending(p.members);
    } catch (err) {
      setError(err.message);
    }
  }, [group.slug, group.canView, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(userId, path, method, body, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(userId);
    setError("");
    try {
      await api(`/api/groups/${group.slug}/members/${userId}${path}`, { method, body });
      await Promise.all([load(), reload()]); // refresh the list AND the header counts
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!group.canView) return <p className="py-8 text-center opacity-60">🔒 Only members can see who&apos;s in this group.</p>;
  if (!members) return <p className="py-6 opacity-60">Loading members…</p>;

  const iAmOwner = group.myRole === "OWNER";

  function memberActions(m) {
    if (!isAdmin || m.id === user?.id || m.role === "OWNER") return null;
    const busy = busyId === m.id;
    const buttons = [];
    if (iAmOwner) {
      buttons.push(
        m.role === "ADMIN" ? (
          <SmallButton key="role" disabled={busy} onClick={() => act(m.id, "", "PATCH", { role: "MEMBER" })}>
            Remove admin
          </SmallButton>
        ) : (
          <SmallButton key="role" disabled={busy} onClick={() => act(m.id, "", "PATCH", { role: "ADMIN" })}>
            Make admin
          </SmallButton>
        )
      );
    }
    // Admins can remove members; only the owner can remove another admin.
    if (m.role === "MEMBER" || iAmOwner) {
      buttons.push(
        <SmallButton key="remove" danger disabled={busy} onClick={() => act(m.id, "", "DELETE", undefined, `Remove ${m.name} from the group?`)}>
          Remove
        </SmallButton>
      );
    }
    return buttons;
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {isAdmin && pending.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-2">
          <h2 className="pt-2 font-semibold">Join requests ({pending.length})</h2>
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {pending.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                actions={[
                  <SmallButton key="ok" disabled={busyId === m.id} onClick={() => act(m.id, "/approve", "POST")}>
                    Approve
                  </SmallButton>,
                  <SmallButton key="no" danger disabled={busyId === m.id} onClick={() => act(m.id, "", "DELETE")}>
                    Decline
                  </SmallButton>,
                ]}
              />
            ))}
          </ul>
        </section>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">{members.length} members</h2>
      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} actions={memberActions(m)} />
        ))}
      </ul>
    </div>
  );
}
