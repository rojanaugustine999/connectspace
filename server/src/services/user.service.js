// Profiles, search and following. All of this is relational data → PostgreSQL via Prisma.
import { prisma } from "../config/prisma.js";
import { httpError } from "../utils/httpError.js";
import { publicUserFields } from "./auth.service.js";
import { createNotification } from "./notification.service.js";

const PAGE_SIZE = 20;

// What other people may see about a user. Email stays private.
const listUserFields = { id: true, username: true, name: true, bio: true, avatarUrl: true };

async function findUserIdOrThrow(username) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw httpError(404, "User not found");
  return user.id;
}

// Adds `isFollowing` to a list of users with ONE extra query (not one query per user).
// Doing a query inside a loop is called the "N+1 problem", and it gets slow fast.
async function withFollowState(users, viewerId) {
  if (!viewerId || users.length === 0) return users.map((u) => ({ ...u, isFollowing: false }));

  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: users.map((u) => u.id) } },
    select: { followingId: true },
  });
  const followed = new Set(rows.map((r) => r.followingId));
  return users.map((u) => ({ ...u, isFollowing: followed.has(u.id) }));
}

export async function getProfile(username, viewerId) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      ...listUserFields,
      createdAt: true,
      // _count asks PostgreSQL to COUNT the related rows for us.
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) throw httpError(404, "User not found");

  const { _count, ...rest } = user;
  const [withState] = await withFollowState([rest], viewerId);
  return {
    ...withState,
    followerCount: _count.followers,
    followingCount: _count.following,
    isMe: viewerId === user.id,
  };
}

export async function updateMe(userId, data) {
  const changes = { ...data };
  if (changes.avatarUrl === "") changes.avatarUrl = null; // empty field = remove avatar
  if (changes.bio === "") changes.bio = null;

  return prisma.user.update({ where: { id: userId }, data: changes, select: publicUserFields });
}

export async function searchUsers(query, viewerId) {
  const q = query.trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined, // no search text → show newest members
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: listUserFields,
  });
  return withFollowState(users, viewerId);
}

export async function follow(followerId, username) {
  const targetId = await findUserIdOrThrow(username);
  if (targetId === followerId) throw httpError(400, "You can't follow yourself");

  // createMany + skipDuplicates: following twice is harmless, it just does nothing the second time.
  const { count } = await prisma.follow.createMany({
    data: [{ followerId, followingId: targetId }],
    skipDuplicates: true,
  });

  if (count === 1) {
    // The follow is saved in PostgreSQL. The notification is a "nice extra" in MongoDB:
    // if MongoDB has a problem, log it but don't fail the follow.
    try {
      await createNotification({ userId: targetId, type: "follow", actorId: followerId });
    } catch (err) {
      console.error("Could not create follow notification:", err.message);
    }
  }

  return followStatus(targetId, true);
}

export async function unfollow(followerId, username) {
  const targetId = await findUserIdOrThrow(username);
  await prisma.follow.deleteMany({ where: { followerId, followingId: targetId } });
  return followStatus(targetId, false);
}

async function followStatus(targetId, isFollowing) {
  const followerCount = await prisma.follow.count({ where: { followingId: targetId } });
  return { isFollowing, followerCount };
}

// type = "followers" (people who follow this user) or "following" (people this user follows).
// Uses page numbers (offset pagination). In Week 5 the feed uses cursor pagination, so you can compare.
export async function listConnections(username, type, page, viewerId) {
  const userId = await findUserIdOrThrow(username);
  const isFollowers = type === "followers";
  const where = isFollowers ? { followingId: userId } : { followerId: userId };
  const relation = isFollowers ? "follower" : "following";

  const [rows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { [relation]: { select: listUserFields } },
    }),
    prisma.follow.count({ where }),
  ]);

  const users = await withFollowState(
    rows.map((r) => r[relation]),
    viewerId
  );
  return { users, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total };
}
