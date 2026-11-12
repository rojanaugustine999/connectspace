import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, newUser } from "./helpers.js";

let app, author, fan;
before(async () => {
  app = await startServer();
  author = await newUser(app.base, "Author");
  fan = await newUser(app.base, "Fan");
});
after(async () => app.stop());

const newPost = async (content = "Hello world") => (await author.post("/api/posts", { content })).data.post;

test("create post: needs login and text; author name comes from PostgreSQL", async () => {
  assert.equal((await client(app.base).post("/api/posts", { content: "hi" })).status, 401);
  assert.equal((await author.post("/api/posts", { content: "   " })).status, 400);
  const r = await author.post("/api/posts", { content: "My first post" });
  assert.equal(r.status, 201);
  assert.equal(r.data.post.author.name, "Author");
  assert.equal(r.data.post.isMine, true);
});

test("invalid post id → 404, not a crash", async () => {
  assert.equal((await client(app.base).get("/api/posts/not-an-id")).status, 404);
});

test("likes: counted once even when sent at the same moment; never below zero", async () => {
  const post = await newPost();
  const path = `/api/posts/${post.id}/like`;
  const [a, b] = await Promise.all([fan.post(path), fan.post(path)]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal((await fan.get(`/api/posts/${post.id}`)).data.post.likeCount, 1);
  assert.equal((await fan.get(`/api/posts/${post.id}`)).data.post.likedByMe, true);

  assert.equal((await fan.del(path)).data.likeCount, 0);
  assert.equal((await fan.del(path)).data.likeCount, 0);
});

test("comments: replies form a one-level tree and update the count", async () => {
  const post = await newPost();
  const base = `/api/posts/${post.id}/comments`;
  const top = await fan.post(base, { content: "Nice!" });
  assert.equal(top.status, 201);
  const reply = await author.post(base, { content: "Thanks", parentId: top.data.comment.id });
  assert.equal(reply.data.comment.parentId, top.data.comment.id);
  const deeper = await fan.post(base, { content: "reply to reply", parentId: reply.data.comment.id });
  assert.equal(deeper.data.comment.parentId, top.data.comment.id, "replies to replies attach to the top comment");
  assert.equal(deeper.data.commentCount, 3);

  const tree = await fan.get(base);
  assert.equal(tree.data.comments.length, 1);
  assert.equal(tree.data.comments[0].replies.length, 2);

  assert.equal((await fan.del(`${base}/${reply.data.comment.id}`)).status, 403, "can't delete someone else's comment");
  const removed = await author.del(`${base}/${top.data.comment.id}`);
  assert.equal(removed.data.deleted, 3, "deleting a comment removes its replies");
  assert.equal(removed.data.commentCount, 0);
});

test("deleting a post: author only, and its likes and comments go with it", async () => {
  const post = await newPost();
  await fan.post(`/api/posts/${post.id}/like`);
  await fan.post(`/api/posts/${post.id}/comments`, { content: "bye" });

  assert.equal((await fan.del(`/api/posts/${post.id}`)).status, 403);
  assert.equal((await author.del(`/api/posts/${post.id}`)).status, 204);
  assert.equal((await fan.get(`/api/posts/${post.id}`)).status, 404);

  const { Like } = await import("../src/models/Like.js");
  const { Comment } = await import("../src/models/Comment.js");
  assert.equal(await Like.countDocuments({ postId: post.id }), 0);
  assert.equal(await Comment.countDocuments({ postId: post.id }), 0);
});

test("post with an invalid image URL → 400", async () => {
  assert.equal((await author.post("/api/posts", { content: "photo", images: ["not a url"] })).status, 400);
});
