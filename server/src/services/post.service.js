// Posts, likes and comments live in MongoDB. Authors live in PostgreSQL.
// Every list goes through hydratePosts(), which adds author info + "did I like this?" with
// a fixed number of queries, no matter how many posts there are.
import mongoose from "mongoose";
import { Post } from "../models/Post.js";
import { Like } from "../models/Like.js";
import { Comment } from "../models/Comment.js";
import { Notification } from "../models/Notification.js";
import { prisma } from "../config/prisma.js";
import { httpError } from "../utils/httpError.js";
import { createNotification } from "./notification.service.js";

const PAGE_SIZE = 10;
const authorFields = { id: true, username: true, name: true, avatarUrl: true };

// ---------- helpers ----------

async function loadAuthors(ids) {
  const unique = [...new Set(ids)];
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: authorFields });
  return new Map(users.map((u) => [u.id, u]));
}

const deletedUser = { id: null, username: "deleted", name: "Deleted user", avatarUrl: null };

export async function hydratePosts(posts, viewerId) {
  if (posts.length === 0) return [];

  const [authors, myLikes] = await Promise.all([
    loadAuthors(posts.map((p) => p.authorId)), // 1 PostgreSQL query
    viewerId // 1 MongoDB query
      ? Like.find({ userId: viewerId, postId: { $in: posts.map((p) => p._id) } }, { postId: 1 }).lean()
      : [],
  ]);
  const likedIds = new Set(myLikes.map((l) => l.postId.toString()));

  return posts.map((p) => ({
    id: p._id.toString(),
    content: p.content,
    images: p.images ?? [],
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    createdAt: p.createdAt,
    author: authors.get(p.authorId) ?? deletedUser,
    likedByMe: likedIds.has(p._id.toString()),
    isMine: viewerId === p.authorId,
  }));
}

async function findPostOrThrow(postId) {
  const post = await Post.findById(postId).lean();
  if (!post) throw httpError(404, "Post not found");
  return post;
}

// ---------- posts ----------

export async function createPost(userId, { content, images = [] }) {
  const post = await Post.create({ authorId: userId, content, images });
  const [hydrated] = await hydratePosts([post.toObject()], userId);
  return hydrated;
}

export async function getPost(postId, viewerId) {
  const post = await findPostOrThrow(postId);
  const [hydrated] = await hydratePosts([post], viewerId);
  return hydrated;
}

export async function deletePost(postId, userId) {
  const post = await findPostOrThrow(postId);
  // 403 Forbidden = "we know who you are, but you're not allowed to do this".
  if (post.authorId !== userId) throw httpError(403, "You can only delete your own posts");

  // MongoDB has no foreign keys / ON DELETE CASCADE, so we clean up related documents ourselves.
  await Promise.all([
    Post.deleteOne({ _id: postId }),
    Like.deleteMany({ postId }),
    Comment.deleteMany({ postId }),
    Notification.deleteMany({ postId }),
  ]);
}

// ---------- cursor pagination (used by profile posts, the home feed and explore) ----------
//
// The client sends back the cursor of the last post it has, and we return the next 10 older ones.
// Unlike ?page=2, new posts arriving at the top don't shift the list, so you never see
// duplicates or skip posts while scrolling.
//
// The cursor is "createdAt_id", e.g. "2026-11-10T09:00:00.000Z_6730f1c2a1b2c3d4e5f60718".
// Why both? Two posts can have the exact same createdAt. Using only the date, the second one
// would be skipped. The _id breaks the tie, so the order is always exact.

function encodeCursor(post) {
  return `${post.createdAt.toISOString()}_${post._id}`;
}

function decodeCursor(cursor) {
  const [iso, id] = String(cursor).split("_");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(id)) throw httpError(400, "Invalid cursor");
  return { date, id: new mongoose.Types.ObjectId(id) };
}

async function paginatePosts(filter, viewerId, cursor) {
  const query = { ...filter };
  if (cursor) {
    const { date, id } = decodeCursor(cursor);
    // "older than the cursor": an earlier date, OR the same date with a smaller id
    query.$or = [{ createdAt: { $lt: date } }, { createdAt: date, _id: { $lt: id } }];
  }

  // Ask for one extra post: if it exists, there's another page.
  const posts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(PAGE_SIZE + 1).lean();
  const hasMore = posts.length > PAGE_SIZE;
  const page = posts.slice(0, PAGE_SIZE);

  return {
    posts: await hydratePosts(page, viewerId),
    nextCursor: hasMore ? encodeCursor(page.at(-1)) : null,
  };
}

// Posts by one user, newest first.
export async function listUserPosts(username, viewerId, cursor) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw httpError(404, "User not found");
  return paginatePosts({ authorId: user.id }, viewerId, cursor);
}

// The home feed: posts from people you follow + your own.
//   1. PostgreSQL: who do I follow?            → [id1, id2, ...]
//   2. MongoDB:    their posts, newest first   → Post.find({ authorId: { $in: ids } })
//   3. PostgreSQL: author names/avatars         (inside hydratePosts)
//
// This is "fan-out on read": the feed is built when you open it. It's simple and works well
// for thousands of users. Huge apps precompute each user's feed when someone posts
// ("fan-out on write") because $in with millions of ids would be too slow.
export async function getFeed(userId, cursor) {
  const follows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const authorIds = [userId, ...follows.map((f) => f.followingId)];

  const result = await paginatePosts({ authorId: { $in: authorIds } }, userId, cursor);
  return { ...result, followingCount: follows.length };
}

// Explore: everyone's latest posts (used on the home page when you're logged out).
export function getExplore(viewerId, cursor) {
  return paginatePosts({}, viewerId, cursor);
}

// ---------- likes ----------

export async function likePost(postId, userId) {
  const post = await findPostOrThrow(postId);

  try {
    // The unique index on { postId, userId } makes MongoDB itself refuse a second like,
    // even if two requests arrive at the same moment.
    await Like.create({ postId, userId });
  } catch (err) {
    if (err.code === 11000) return { liked: true, likeCount: post.likeCount }; // already liked: nothing to do
    throw err;
  }

  // $inc changes the number inside MongoDB in one step. Reading the count, adding 1 in JavaScript
  // and saving it back could lose likes when two people like at the same time.
  const updated = await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } }, { returnDocument: "after" }).lean();

  await createNotification({ userId: post.authorId, type: "like", actorId: userId, postId }).catch((err) =>
    console.error("Could not create like notification:", err.message)
  );

  return { liked: true, likeCount: updated.likeCount };
}

export async function unlikePost(postId, userId) {
  await findPostOrThrow(postId);
  const { deletedCount } = await Like.deleteOne({ postId, userId });

  // Only decrease if a like was really removed, and never below 0.
  const updated = deletedCount
    ? await Post.findOneAndUpdate({ _id: postId, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } }, { returnDocument: "after" }).lean()
    : null;

  const likeCount = updated?.likeCount ?? (await Post.findById(postId, { likeCount: 1 }).lean()).likeCount;
  return { liked: false, likeCount };
}

// ---------- comments ----------

function shapeComment(c, authors, viewerId, postAuthorId) {
  return {
    id: c._id.toString(),
    content: c.content,
    parentId: c.parentId?.toString() ?? null,
    createdAt: c.createdAt,
    author: authors.get(c.authorId) ?? deletedUser,
    // You can delete your own comments, and anything on your own post.
    canDelete: Boolean(viewerId) && (viewerId === c.authorId || viewerId === postAuthorId),
  };
}

// Returns top-level comments, each with a `replies` array (one level deep, like most social apps).
export async function listComments(postId, viewerId) {
  const post = await findPostOrThrow(postId);
  const comments = await Comment.find({ postId }).sort({ createdAt: 1 }).limit(500).lean();
  const authors = await loadAuthors(comments.map((c) => c.authorId));

  const shaped = comments.map((c) => shapeComment(c, authors, viewerId, post.authorId));
  const topLevel = shaped.filter((c) => !c.parentId).map((c) => ({ ...c, replies: [] }));
  const byId = new Map(topLevel.map((c) => [c.id, c]));
  for (const c of shaped) {
    if (c.parentId) byId.get(c.parentId)?.replies.push(c);
  }
  return topLevel;
}

export async function addComment(postId, userId, { content, parentId }) {
  const post = await findPostOrThrow(postId);

  if (parentId) {
    const parent = await Comment.findById(parentId).lean();
    if (!parent || parent.postId.toString() !== postId) throw httpError(400, "That comment isn't on this post");
    // Replying to a reply attaches to the same top-level comment (keeps threads one level deep).
    if (parent.parentId) parentId = parent.parentId.toString();
  }

  const comment = await Comment.create({ postId, authorId: userId, content, parentId: parentId ?? null });
  const updated = await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } }, { returnDocument: "after" }).lean();

  await createNotification({ userId: post.authorId, type: "comment", actorId: userId, postId }).catch((err) =>
    console.error("Could not create comment notification:", err.message)
  );

  const authors = await loadAuthors([userId]);
  return {
    comment: { ...shapeComment(comment.toObject(), authors, userId, post.authorId), replies: [] },
    commentCount: updated.commentCount,
  };
}

export async function deleteComment(postId, commentId, userId) {
  const post = await findPostOrThrow(postId);
  const comment = await Comment.findOne({ _id: commentId, postId }).lean();
  if (!comment) throw httpError(404, "Comment not found");
  if (comment.authorId !== userId && post.authorId !== userId) {
    throw httpError(403, "You can't delete this comment");
  }

  // Deleting a top-level comment also deletes its replies.
  const { deletedCount } = await Comment.deleteMany({
    $or: [{ _id: new mongoose.Types.ObjectId(commentId) }, { parentId: commentId }],
  });
  const updated = await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -deletedCount } }, { returnDocument: "after" }).lean();
  return { deleted: deletedCount, commentCount: Math.max(0, updated.commentCount) };
}
