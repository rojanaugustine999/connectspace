// Notifications live in MongoDB, but the people in them (the "actor") live in PostgreSQL.
// MongoDB and PostgreSQL can't JOIN each other, so we:
//   1. read the notifications from MongoDB
//   2. collect the actor IDs
//   3. load those users from PostgreSQL in ONE query
//   4. merge them together in JavaScript
import { Notification } from "../models/Notification.js";
import { prisma } from "../config/prisma.js";
import { emitToUsers } from "../socket/emitter.js";

const actorFields = { id: true, username: true, name: true, avatarUrl: true };

export async function createNotification({ userId, type, actorId, postId = null }) {
  if (userId === actorId) return; // never notify yourself

  // Follow → unfollow → follow again (or like → unlike → like) shouldn't create three notifications.
  if (type === "follow" || type === "like") await Notification.deleteMany({ userId, type, actorId, postId });

  const n = await Notification.create({ userId, type, actorId, postId });

  // Week 6: push it to the user's open tabs right away (no refresh needed).
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: actorFields });
  emitToUsers([userId], "notification:new", {
    notification: {
      id: n._id.toString(),
      type,
      isRead: false,
      postId: postId?.toString() ?? null,
      createdAt: n.createdAt,
      actor,
    },
  });
}

export async function listNotifications(userId, limit = 30) {
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();

  const actorIds = [...new Set(notifications.map((n) => n.actorId))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: actorFields });
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return notifications
    .filter((n) => actorById.has(n.actorId)) // skip notifications from deleted users
    .map((n) => ({
      id: n._id.toString(),
      type: n.type,
      isRead: n.isRead,
      postId: n.postId?.toString() ?? null,
      createdAt: n.createdAt,
      actor: actorById.get(n.actorId),
    }));
}

export function countUnread(userId) {
  return Notification.countDocuments({ userId, isRead: false });
}

export async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  return result.modifiedCount;
}
