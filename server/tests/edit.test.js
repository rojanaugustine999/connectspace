import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, newUser } from "./helpers.js";

let app, author, other, friend, newFriend;
before(async () => {
  app = await startServer();
  [author, other, friend, newFriend] = await Promise.all([
    newUser(app.base, "Author"),
    newUser(app.base, "Other"),
    newUser(app.base, "Friend"),
    newUser(app.base, "NewFriend"),
  ]);
});
after(async () => app.stop());

const newPost = async (content) => (await author.post("/api/posts", { content })).data.post;
const mentionsOf = async (who, postId) =>
  (await who.get("/api/notifications")).data.notifications.filter((n) => n.type === "mention" && n.postId === postId).length;

test("only the author can edit; the text is checked like a new post", async () => {
  const post = await newPost("First draft");
  assert.equal(post.editedAt, null);

  assert.equal((await client(app.base).patch(`/api/posts/${post.id}`, { content: "x" })).status, 401);
  assert.equal((await other.patch(`/api/posts/${post.id}`, { content: "hijacked" })).status, 403);
  assert.equal((await author.patch(`/api/posts/${post.id}`, { content: "   " })).status, 400);
  assert.equal((await author.patch(`/api/posts/${post.id}`, { content: "x".repeat(2001) })).status, 400);
  assert.equal((await author.patch("/api/posts/not-an-id", { content: "x" })).status, 404);

  const r = await author.patch(`/api/posts/${post.id}`, { content: "  Final version  " });
  assert.equal(r.status, 200);
  assert.equal(r.data.post.content, "Final version");
  assert.ok(r.data.post.editedAt, "marked as edited");
  assert.equal((await other.get(`/api/posts/${post.id}`)).data.post.content, "Final version");
});

test("saving the same text doesn't mark the post as edited", async () => {
  const post = await newPost("Nothing changes");
  const r = await author.patch(`/api/posts/${post.id}`, { content: "Nothing changes" });
  assert.equal(r.status, 200);
  assert.equal(r.data.post.editedAt, null);
});

test("editing can't change photos or other fields", async () => {
  const post = await newPost("Text only");
  const r = await author.patch(`/api/posts/${post.id}`, { content: "Text only, edited", likeCount: 999, authorId: other.user.id, images: ["https://example.com/x.png"] });
  assert.equal(r.status, 200);
  assert.equal(r.data.post.likeCount, 0);
  assert.equal(r.data.post.author.username, author.user.username);
  assert.deepEqual(r.data.post.images, []);
});

test("new @mentions notify once; people already mentioned aren't notified again", async () => {
  const post = await newPost(`Hi @${friend.user.username}`);
  assert.equal(await mentionsOf(friend, post.id), 1);

  await author.patch(`/api/posts/${post.id}`, { content: `Hi @${friend.user.username} and @${newFriend.user.username}` });
  assert.equal(await mentionsOf(friend, post.id), 1, "not notified twice");
  assert.equal(await mentionsOf(newFriend, post.id), 1);

  await author.patch(`/api/posts/${post.id}`, { content: `Hi @${friend.user.username} and @${newFriend.user.username}!` });
  assert.equal(await mentionsOf(newFriend, post.id), 1, "small edits don't re-notify");
});

test("search finds the new text, not the old", async () => {
  const oldWord = `qzold${Math.random().toString(36).slice(2, 8)}`;
  const newWord = `qznew${Math.random().toString(36).slice(2, 8)}`;
  const post = await newPost(`About ${oldWord}`);
  await author.patch(`/api/posts/${post.id}`, { content: `About ${newWord}` });

  const guest = client(app.base);
  assert.equal((await guest.get(`/api/posts/search?q=${oldWord}`)).data.posts.length, 0);
  assert.equal((await guest.get(`/api/posts/search?q=${newWord}`)).data.posts[0].id, post.id);
});
