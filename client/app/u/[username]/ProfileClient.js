"use client";

// Public profile page: /u/alice (the browser part; page.js is the server part)
// Flow: GET /api/users/alice  (optionalAuth on the server: if you're logged in, it also tells us isFollowing / isMe)
// For guests, the server already fetched the profile and first posts (`initial`), so they show at once.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatJoined } from "@/lib/format";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import UserPosts from "@/components/UserPosts";
import MessageButton from "@/components/MessageButton";

export default function ProfileClient({ initial = null }) {
  const { username } = useParams();
  const { user: me, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(initial?.profile ?? null);
  const [status, setStatus] = useState(initial ? "ready" : "loading"); // loading | ready | notfound | error
  const usingServerData = useRef(Boolean(initial));

  useEffect(() => {
    if (authLoading) return; // wait until we know who's viewing, so isFollowing is correct
    if (usingServerData.current) {
      usingServerData.current = false;
      if (!me?.id) return; // a guest: the server's copy is already right
    }
    setStatus("loading");
    api(`/api/users/${username}`)
      .then((data) => {
        setProfile(data.user);
        setStatus("ready");
      })
      .catch((err) => setStatus(err.status === 404 ? "notfound" : "error"));
  }, [username, authLoading, me?.id]);

  if (status === "loading") return <p className="p-8 text-center opacity-60">Loading profile…</p>;
  if (status === "notfound") {
    return (
      <main className="p-8 text-center">
        <h1 className="text-xl font-bold">User not found</h1>
        <p className="mt-2 opacity-70">There&apos;s no one called @{username}.</p>
        <Link href="/search" className="mt-4 inline-block underline">
          Find people
        </Link>
      </main>
    );
  }
  if (status === "error") return <p className="p-8 text-center text-danger">Could not load this profile.</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 font-sans">
      <div className="flex items-start gap-4 sm:gap-6">
        <Avatar user={profile} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold break-words">{profile.name}</h1>
              <p className="opacity-60">@{profile.username}</p>
            </div>
            {profile.isMe ? (
              <Link
                href="/settings/profile"
                className="rounded-full border border-field px-5 py-2 font-medium hover:bg-subtle"
              >
                Edit profile
              </Link>
            ) : (
              <div className="flex items-start gap-2">
                <MessageButton username={profile.username} />
                <FollowButton
                  key={profile.id + profile.isFollowing}
                  username={profile.username}
                  initialFollowing={profile.isFollowing}
                  onChange={({ followerCount }) => setProfile((p) => ({ ...p, followerCount }))}
                />
              </div>
            )}
          </div>

          {profile.bio && <p className="mt-3 whitespace-pre-line break-words">{profile.bio}</p>}
          <p className="mt-2 text-sm opacity-60" suppressHydrationWarning>
            Joined {formatJoined(profile.createdAt)}
          </p>

          <div className="mt-3 flex gap-5 text-sm">
            <Link href={`/u/${profile.username}/following`} className="hover:underline">
              <strong>{profile.followingCount}</strong> <span className="opacity-70">Following</span>
            </Link>
            <Link href={`/u/${profile.username}/followers`} className="hover:underline">
              <strong>{profile.followerCount}</strong>{" "}
              <span className="opacity-70">{profile.followerCount === 1 ? "Follower" : "Followers"}</span>
            </Link>
          </div>
        </div>
      </div>

      <UserPosts username={profile.username} isMe={profile.isMe} viewerKey={me?.id} initialData={initial?.posts} />
    </main>
  );
}
