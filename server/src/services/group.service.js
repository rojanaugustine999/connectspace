// Groups: the group + who's in it live in PostgreSQL (relational, needs roles and constraints).
// The group's posts live in MongoDB with a groupId, like any other post.
import { prisma } from "../config/prisma.js";
import { httpError } from "../utils/httpError.js";
import { Post } from "../models/Post.js";
import { Like } from "../models/Like.js";
import { Comment } from "../models/Comment.js";
import { Notification } from "../models/Notification.js";
import { createPost, paginatePosts } from "./post.service.js";
import { getMembership, isActiveMember, isAdmin, isOwner, canViewGroup } from "./group.access.js";

const userFields = { id: true, username: true, name: true, avatarUrl: true, bio: true };
// Prisma can count only the related rows that match a filter.
const activeMemberCount = { _count: { select: { members: { where: { status: "ACTIVE" } } } } };

// "Kochi Designers!" → "kochi-designers"
function slugify(name) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "group";
}

async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await prisma.group.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

async function findGroupOrThrow(slug) {
  const group = await prisma.group.findUnique({ where: { slug }, include: activeMemberCount });
  if (!group) throw httpError(404, "Group not found");
  return group;
}

function shapeGroup(group, membership) {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    isPrivate: group.isPrivate,
    createdAt: group.createdAt,
    memberCount: group._count?.members ?? 0,
    myStatus: membership?.status ?? null, // null | "PENDING" | "ACTIVE"
    myRole: isActiveMember(membership) ? membership.role : null,
    canView: canViewGroup(group, membership),
  };
}

// ---------- groups ----------

export async function createGroup(userId, { name, description, isPrivate }) {
  // A nested create: the group AND its first member (the owner) in one transaction.
  const group = await prisma.group.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      description: description || null,
      isPrivate,
      members: { create: { userId, role: "OWNER", status: "ACTIVE" } },
    },
    include: activeMemberCount,
  });
  return shapeGroup(group, { role: "OWNER", status: "ACTIVE" });
}

export async function listGroups(viewerId, query = "") {
  const q = query.trim();
  const groups = await prisma.group.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 30,
    include: activeMemberCount,
  });

  // My memberships for all of these groups in ONE query (no N+1).
  const mine = viewerId
    ? await prisma.groupMember.findMany({ where: { userId: viewerId, groupId: { in: groups.map((g) => g.id) } } })
    : [];
  const byGroup = new Map(mine.map((m) => [m.groupId, m]));
  return groups.map((g) => shapeGroup(g, byGroup.get(g.id)));
}

export async function listMyGroups(userId) {
  const rows = await prisma.groupMember.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { joinedAt: "desc" },
    include: { group: { include: activeMemberCount } },
  });
  return rows.map((m) => shapeGroup(m.group, m));
}

export async function getGroup(slug, viewerId) {
  const group = await findGroupOrThrow(slug);
  const membership = await getMembership(group.id, viewerId);
  const shaped = shapeGroup(group, membership);
  if (isAdmin(membership)) {
    shaped.pendingCount = await prisma.groupMember.count({ where: { groupId: group.id, status: "PENDING" } });
  }
  return shaped;
}

export async function updateGroup(slug, userId, data) {
  const group = await findGroupOrThrow(slug);
  const membership = await getMembership(group.id, userId);
  if (!isAdmin(membership)) throw httpError(403, "Only group admins can edit the group");

  const updated = await prisma.group.update({
    where: { id: group.id },
    data: { ...data, ...(data.description !== undefined && { description: data.description || null }) },
    include: activeMemberCount,
  });

  // Turning a private group public: anyone waiting for approval simply becomes a member.
  if (group.isPrivate && data.isPrivate === false) {
    await prisma.groupMember.updateMany({ where: { groupId: group.id, status: "PENDING" }, data: { status: "ACTIVE" } });
  }
  return shapeGroup(updated, membership);
}

export async function deleteGroup(slug, userId) {
  const group = await findGroupOrThrow(slug);
  if (!isOwner(await getMembership(group.id, userId))) throw httpError(403, "Only the owner can delete the group");

  // PostgreSQL deletes the memberships automatically (onDelete: Cascade).
  // MongoDB has no cascades, so we delete the group's posts and everything attached to them ourselves.
  const postIds = await Post.find({ groupId: group.id }).distinct("_id");
  await Promise.all([
    Like.deleteMany({ postId: { $in: postIds } }),
    Comment.deleteMany({ postId: { $in: postIds } }),
    Notification.deleteMany({ postId: { $in: postIds } }),
    Post.deleteMany({ groupId: group.id }),
  ]);
  await prisma.group.delete({ where: { id: group.id } });
}

// ---------- membership ----------

export async function joinGroup(slug, userId) {
  const group = await findGroupOrThrow(slug);
  const existing = await getMembership(group.id, userId);
  if (existing) return { status: existing.status }; // already a member / already asked

  // Public → you're in. Private → a join request that an admin must approve.
  const status = group.isPrivate ? "PENDING" : "ACTIVE";
  await prisma.groupMember
    .create({ data: { userId, groupId: group.id, role: "MEMBER", status } })
    .catch((err) => {
      if (err.code !== "P2002") throw err; // double click: the row already exists, which is fine
    });
  return { status };
}

// Leave a group, or cancel your pending request.
export async function leaveGroup(slug, userId) {
  const group = await findGroupOrThrow(slug);
  const membership = await getMembership(group.id, userId);
  if (!membership) return { status: null };
  if (isOwner(membership)) throw httpError(400, "The owner can't leave. Delete the group instead.");
  await prisma.groupMember.delete({ where: { userId_groupId: { userId, groupId: group.id } } });
  return { status: null };
}

export async function listMembers(slug, viewerId, status = "ACTIVE") {
  const group = await findGroupOrThrow(slug);
  const membership = await getMembership(group.id, viewerId);

  if (status === "PENDING" && !isAdmin(membership)) throw httpError(403, "Only admins can see join requests");
  if (!canViewGroup(group, membership)) throw httpError(403, "This group is private");

  const rows = await prisma.groupMember.findMany({
    where: { groupId: group.id, status },
    // Owner first, then admins, then members (enum order), newest first within each.
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
    include: { user: { select: userFields } },
    take: 200,
  });
  return rows.map((m) => ({ ...m.user, role: m.role, status: m.status, joinedAt: m.joinedAt }));
}

// Shared checks for admin actions on another member.
async function loadForModeration(slug, actorId, targetUserId) {
  const group = await findGroupOrThrow(slug);
  const actor = await getMembership(group.id, actorId);
  if (!isAdmin(actor)) throw httpError(403, "Only group admins can do that");
  const target = await getMembership(group.id, targetUserId);
  if (!target) throw httpError(404, "That person isn't in this group");
  return { group, actor, target };
}

export async function approveMember(slug, adminId, targetUserId) {
  const { group, target } = await loadForModeration(slug, adminId, targetUserId);
  if (target.status === "ACTIVE") return { status: "ACTIVE" };
  await prisma.groupMember.update({
    where: { userId_groupId: { userId: targetUserId, groupId: group.id } },
    data: { status: "ACTIVE", joinedAt: new Date() },
  });
  return { status: "ACTIVE" };
}

// Remove a member, or reject a join request.
export async function removeMember(slug, adminId, targetUserId) {
  if (adminId === targetUserId) throw httpError(400, "Use 'Leave group' to remove yourself");
  const { group, actor, target } = await loadForModeration(slug, adminId, targetUserId);

  if (target.role === "OWNER") throw httpError(403, "The owner can't be removed");
  // Admins can remove members and reject requests; only the owner can remove another admin.
  if (target.role === "ADMIN" && target.status === "ACTIVE" && actor.role !== "OWNER") {
    throw httpError(403, "Only the owner can remove an admin");
  }
  await prisma.groupMember.delete({ where: { userId_groupId: { userId: targetUserId, groupId: group.id } } });
  return { removed: true };
}

export async function setRole(slug, ownerId, targetUserId, role) {
  const { group, actor, target } = await loadForModeration(slug, ownerId, targetUserId);
  if (actor.role !== "OWNER") throw httpError(403, "Only the owner can change roles");
  if (target.role === "OWNER") throw httpError(400, "The owner's role can't be changed");
  if (target.status !== "ACTIVE") throw httpError(400, "Approve the request first");

  await prisma.groupMember.update({
    where: { userId_groupId: { userId: targetUserId, groupId: group.id } },
    data: { role },
  });
  return { role };
}

// ---------- group posts ----------

export async function listGroupPosts(slug, viewerId, cursor) {
  const group = await findGroupOrThrow(slug);
  if (!canViewGroup(group, await getMembership(group.id, viewerId))) throw httpError(403, "This group is private");
  return paginatePosts({ groupId: group.id }, viewerId, cursor);
}

export async function createGroupPost(slug, userId, data) {
  const group = await findGroupOrThrow(slug);
  if (!isActiveMember(await getMembership(group.id, userId))) throw httpError(403, "Join the group to post");
  return createPost(userId, data, group.id);
}
