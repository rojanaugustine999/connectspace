import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, newUser } from "./helpers.js";

let app, reader, followed, stranger;
before(async () => {
  app = await startServer();
  [reader, followed, stranger] = await Promise.all([
    newUser(app.base, "Reader"),
    newUser(app.base, "Followed"),
    newUser(app.base, "Stranger"),
  ]);
  await reader.post(`/api/users/${followed.user.username}/follow`);
  for (let i = 0; i < 8; i++) await followed.post("/api/posts", { content: `followed ${i}` });
  for (let i = 0; i < 4; i++) await reader.post("/api/posts", { content: `mine ${i}` });
  await stranger.post("/api/posts", { content: "stranger post" });
});
after(async () => app.stop());

async function allPages(c, path) {
  const pages = [];
  let cursor = null;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const r = await c.get(path + (cursor ? `${sep}cursor=${encodeURIComponent(cursor)}` : ""));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    pages.push(r.data);
    cursor = r.data.nextCursor;
  } while (cursor && pages.length < 20);
  return pages;
}

const newestFirst = (posts) => posts.every((p, i) => i === 0 || new Date(posts[i - 1].createdAt) >= new Date(p.createdAt));

test("feed needs login", async () => {
  assert.equal((await client(app.base).get("/api/posts/feed")).status, 401);
});

test("feed = people you follow + you, 10 per page, newest first, no duplicates", async () => {
  const pages = await allPages(reader, "/api/posts/feed");
  const posts = pages.flatMap((p) => p.posts);
  const authors = new Set(posts.map((p) => p.author.username));
  assert.deepEqual([...authors].sort(), [followed.user.username, reader.user.username].sort());
  assert.ok(!authors.has(stranger.user.username));
  assert.equal(posts.length, 12);
  assert.deepEqual(pages.map((p) => p.posts.length), [10, 2]);
  assert.equal(new Set(posts.map((p) => p.id)).size, posts.length);
  assert.ok(newestFirst(posts));
  assert.equal(pages[0].followingCount, 1);
});

test("bad cursor → 400", async () => {
  assert.equal((await reader.get("/api/posts/feed?cursor=garbage")).status, 400);
});

test("explore works logged out", async () => {
  const r = await client(app.base).get("/api/posts/explore");
  assert.equal(r.status, 200);
  assert.ok(r.data.posts.length > 0);
  assert.ok(r.data.posts.every((p) => p.likedByMe === false));
});

test("posts with the SAME timestamp are never skipped or repeated across pages", async () => {
  const { Post } = await import("../src/models/Post.js");
  const sameTime = new Date(Date.now() + 60_000);
  await Post.insertMany(
    Array.from({ length: 12 }, (_, i) => ({ authorId: stranger.user.id, content: `tie ${i}`, createdAt: sameTime, updatedAt: sameTime }))
  );
  const posts = (await allPages(reader, `/api/users/${stranger.user.username}/posts`)).flatMap((p) => p.posts);
  assert.equal(posts.filter((p) => p.content.startsWith("tie ")).length, 12);
  assert.equal(new Set(posts.map((p) => p.id)).size, posts.length);
});
