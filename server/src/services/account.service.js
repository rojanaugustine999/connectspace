// Deleting an account: remove everything that belongs to the person, across BOTH databases
// and the image store. PostgreSQL can cascade by itself (follows, group memberships), but
// MongoDB has no foreign keys, so every collection is cleaned up here by hand.
//
// Order matters: MongoDB and images first, the PostgreSQL user LAST. If something fails halfway,
// the account still exists, the person can simply try again, and nothing is left without an owner.
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { httpError } from "../utils/httpError.js";
import { Comment } from "../models/Comment.js";
import { Like } from "../models/Like.js";
import { Post } from "../models/Post.js";
import { Notification } from "../models/Notification.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { deletePostsWhere } from "./post.service.js";
import { deleteImages } from "./storage.service.js";
import { disconnectUser } from "../socket/emitter.js";

// Groups this person owns: hand them to the longest-serving admin, else the longest-serving member.
// A group with nobody else in it is deleted, posts and all.
async function handOverOrDeleteGroups(userId) {
  const owned = await prisma.groupMember.findMany({ where: { userId, role: "OWNER", status: "ACTIVE" }, select: { groupId: true } });
  const images = [];
  for (const { groupId } of owned) {
    const others = { groupId, userId: { not: userId }, status: "ACTIVE" };
    const heir =
      (await prisma.groupMember.findFirst({ where: { ...others, role: "ADMIN" }, orderBy: { joinedAt: "asc" } })) ??
      (await prisma.groupMember.findFirst({ where: others, orderBy: { joinedAt: "asc" } }));
    if (heir) {
      await prisma.groupMember.update({
        where: { userId_groupId: { userId: heir.userId, groupId } },
        data: { role: "OWNER" },
      });
    } else {
      images.push(...(await deletePostsWhere({ groupId })));
      await prisma.group.delete({ where: { id: groupId } });
    }
  }
  return images;
}

export async function deleteAccount(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError(401, "Account not found, please log in again");
  // Ask for the password again: a forgotten open laptop shouldn't be enough to delete an account.
  if (!(await bcrypt.compare(String(password ?? ""), user.password))) {
    throw httpError(403, "That password isn't right", { password: "That password isn't right" });
  }

  const images = await handOverOrDeleteGroups(userId);

  // Their posts, with every like, comment and notification attached to them.
  images.push(...(await deletePostsWhere({ authorId: userId })));

  // Their comments on other people's posts (replies to those comments go too, as with a normal delete),
  // and their likes. Then recount those posts, so no count is left too high.
  const myComments = await Comment.find({ authorId: userId }, { postId: 1, parentId: 1 }).lean();
  const myTopLevel = myComments.filter((c) => !c.parentId).map((c) => c._id);
  const likedPostIds = await Like.find({ userId }).distinct("postId");
  await Promise.all([
    Comment.deleteMany({ $or: [{ authorId: userId }, { parentId: { $in: myTopLevel } }] }),
    Like.deleteMany({ userId }),
  ]);
  const touched = [...new Set([...myComments.map((c) => String(c.postId)), ...likedPostIds.map(String)])];
  await Promise.all(
    touched.map(async (postId) => {
      const [commentCount, likeCount] = await Promise.all([Comment.countDocuments({ postId }), Like.countDocuments({ postId })]);
      await Post.updateOne({ _id: postId }, { $set: { commentCount, likeCount } });
    })
  );

  // Notifications to or from them, and every conversation they were in (both sides: the account and
  // all its data are gone, so the other person's copy of that chat goes too).
  const conversationIds = await Conversation.find({ participants: userId }).distinct("_id");
  await Promise.all([
    Notification.deleteMany({ $or: [{ userId }, { actorId: userId }] }),
    Message.deleteMany({ conversationId: { $in: conversationIds } }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
  ]);

  // Finally the user. PostgreSQL removes their follows and group memberships (onDelete: Cascade).
  await prisma.user.delete({ where: { id: userId } });

  // Photos last and "best effort": a failed image delete shouldn't undo an account deletion.
  await deleteImages([...images, user.avatarUrl].filter(Boolean));
  disconnectUser(userId); // close their live connections (other tabs, other devices)
}
