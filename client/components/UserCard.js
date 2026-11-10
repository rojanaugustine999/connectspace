// One row in a list of people (search results, followers, following).
import Link from "next/link";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";

export default function UserCard({ user }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/u/${user.username}`} className="flex flex-1 min-w-0 items-center gap-3 group">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="font-semibold truncate group-hover:underline">{user.name}</p>
          <p className="text-sm opacity-60 truncate">@{user.username}</p>
          {user.bio && <p className="mt-0.5 text-sm opacity-80 line-clamp-1">{user.bio}</p>}
        </div>
      </Link>
      <FollowButton username={user.username} initialFollowing={user.isFollowing} size="sm" />
    </li>
  );
}
