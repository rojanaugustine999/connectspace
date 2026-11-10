// One-to-one chat. Conversations + messages live in MongoDB, people in PostgreSQL.
// Used by both the REST routes (loading history) and Socket.io (sending live).
import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { prisma } from "../config/prisma.js";
import { httpError } from "../utils/httpError.js";

const PAGE_SIZE = 30;
const userFields = { id: true, username: true, name: true, avatarUrl: true };
const deletedUser = { id: null, username: "deleted", name: "Deleted user", avatarUrl: null };

function shapeMessage(m) {
  return {
    id: m._id.toString(),
    conversationId: m.conversationId.toString(),
    senderId: m.senderId,
    text: m.text,
    readBy: m.readBy ?? [],
    createdAt: m.createdAt,
  };
}

function shapeConversation(c, me, usersById, unreadCount = 0) {
  const otherId = c.participants.find((id) => id !== me);
  return {
    id: c._id.toString(),
    otherUser: usersById.get(otherId) ?? deletedUser,
    lastMessage: c.lastMessage?.text ? c.lastMessage : null,
    updatedAt: c.updatedAt,
    unreadCount,
  };
}

// Only participants may see a conversation. For anyone else we answer 404 (not 403),
// so outsiders can't even find out that the conversation exists.
export async function getConversationForUser(conversationId, userId) {
  if (!mongoose.isValidObjectId(conversationId)) throw httpError(404, "Conversation not found");
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv || !conv.participants.includes(userId)) throw httpError(404, "Conversation not found");
  return conv;
}

// Open (or create) the chat between me and @username.
export async function getOrCreateConversation(userId, username) {
  const other = await prisma.user.findUnique({ where: { username }, select: userFields });
  if (!other) throw httpError(404, "User not found");
  if (other.id === userId) throw httpError(400, "You can't message yourself");

  const participants = [userId, other.id].sort();
  const key = participants.join(":");

  // "Upsert": update if it exists, insert if it doesn't, in one atomic step.
  const upsert = () =>
    Conversation.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, participants } },
      { upsert: true, returnDocument: "after" }
    ).lean();

  let conv;
  try {
    conv = await upsert();
  } catch (err) {
    if (err.code !== 11000) throw err;
    conv = await upsert(); // two requests raced; the other one created it, so just read it
  }
  return shapeConversation(conv, userId, new Map([[other.id, other]]));
}

// My conversations, most recent first, with the other person + my unread count for each.
export async function listConversations(userId) {
  const convs = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).limit(50).lean();
  if (convs.length === 0) return [];

  const otherIds = convs.map((c) => c.participants.find((id) => id !== userId));
  const [users, unread] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: otherIds } }, select: userFields }),
    // Aggregation pipeline: count unread messages PER conversation in one MongoDB query
    // (instead of one countDocuments() per conversation).
    Message.aggregate([
      {
        $match: {
          conversationId: { $in: convs.map((c) => c._id) },
          senderId: { $ne: userId },
          readBy: { $ne: userId },
        },
      },
      { $group: { _id: "$conversationId", count: { $sum: 1 } } },
    ]),
  ]);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const unreadById = new Map(unread.map((u) => [u._id.toString(), u.count]));
  return convs.map((c) => shapeConversation(c, userId, usersById, unreadById.get(c._id.toString()) ?? 0));
}

export async function getConversation(conversationId, userId) {
  const conv = await getConversationForUser(conversationId, userId);
  const otherId = conv.participants.find((id) => id !== userId);
  const other = await prisma.user.findUnique({ where: { id: otherId }, select: userFields });
  return shapeConversation(conv, userId, new Map(other ? [[other.id, other]] : []));
}

// Message history. Newest page first; `nextCursor` loads OLDER messages (scrolling up).
export async function listMessages(conversationId, userId, cursor) {
  await getConversationForUser(conversationId, userId);

  const query = { conversationId };
  if (cursor) {
    const [iso, id] = String(cursor).split("_");
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(id)) throw httpError(400, "Invalid cursor");
    query.$or = [{ createdAt: { $lt: date } }, { createdAt: date, _id: { $lt: new mongoose.Types.ObjectId(id) } }];
  }

  const rows = await Message.find(query).sort({ createdAt: -1, _id: -1 }).limit(PAGE_SIZE + 1).lean();
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const oldest = page.at(-1);

  return {
    messages: page.reverse().map(shapeMessage), // oldest → newest, the order a chat displays them
    nextCursor: hasMore ? `${oldest.createdAt.toISOString()}_${oldest._id}` : null,
  };
}

export async function sendMessage(conversationId, userId, text) {
  const conv = await getConversationForUser(conversationId, userId);

  const message = await Message.create({ conversationId, senderId: userId, text, readBy: [userId] });
  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { lastMessage: { text, senderId: userId, at: message.createdAt } } } // also bumps updatedAt
  );

  return { message: shapeMessage(message.toObject()), participants: conv.participants };
}

export async function markRead(conversationId, userId) {
  const conv = await getConversationForUser(conversationId, userId);
  // $addToSet adds the id only if it isn't in the array yet.
  const { modifiedCount } = await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
  return { updated: modifiedCount, participants: conv.participants };
}

export async function unreadTotal(userId) {
  const convIds = await Conversation.find({ participants: userId }).distinct("_id");
  if (convIds.length === 0) return 0;
  return Message.countDocuments({ conversationId: { $in: convIds }, senderId: { $ne: userId }, readBy: { $ne: userId } });
}
