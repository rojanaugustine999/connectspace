import Link from "next/link";
import GroupIcon from "@/components/GroupIcon";

export function PrivacyLabel({ isPrivate }) {
  return <span className="opacity-60">{isPrivate ? "🔒 Private" : "🌐 Public"}</span>;
}

export default function GroupCard({ group }) {
  const badge =
    group.myRole === "OWNER" ? "Owner" : group.myRole === "ADMIN" ? "Admin" : group.myStatus === "ACTIVE" ? "Joined" : group.myStatus === "PENDING" ? "Requested" : null;

  return (
    <li>
      <Link href={`/groups/${group.slug}`} className="group flex items-center gap-3 py-3">
        <GroupIcon group={group} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:underline">{group.name}</p>
          <p className="text-sm">
            <PrivacyLabel isPrivate={group.isPrivate} />
            <span className="opacity-60">
              {" "}
              · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
            </span>
          </p>
          {group.description && <p className="mt-0.5 line-clamp-1 text-sm opacity-80">{group.description}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-xs font-medium">{badge}</span>
        )}
      </Link>
    </li>
  );
}
