import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, newUser } from "./helpers.js";

// Each test uses its own made-up word, so other tests' posts never show up in the results.
const word = (tag) => `qz${tag}${Math.random().toString(36).slice(2, 8)}`;

let app, author, member, outsider;
before(async () => {
  app = await startServer();
  [author, member, outsider] = await Promise.all([newUser(app.base, "Author"), newUser(app.base, "Member"), newUser(app.base, "Outsider")]);
});
after(async () => app.stop());

const search = (who, q, cursor) =>
  who.get(`/api/posts/search?q=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ""}`);

test("search checks its input", async () => {
  const guest = client(app.base);
  assert.equal((await search(guest, "a")).status, 400);
  assert.equal((await search(guest, "x".repeat(101))).status, 400);
  assert.equal((await search(guest, "hello", "abc")).status, 400);
  assert.equal((await search(guest, "hello", "9")).status, 400, "no deep paging");
});

test("finds posts by word (any case, word stems) and ranks the best match first", async () => {
  const w = word("rank");
  await author.post("/api/posts", { content: `${w} we went running today` });
  await author.post("/api/posts", { content: `${w.toUpperCase()} we went walking today` });
  await author.post("/api/posts", { content: "nothing to see here" });

  // The quoted word must be in every result; "walks" only changes the ranking (and matches "walking").
  const r = await search(client(app.base), `"${w}" walks`);
  assert.equal(r.status, 200);
  assert.equal(r.data.posts.length, 2);
  assert.match(r.data.posts[0].content, /walking/);
  assert.equal(r.data.posts[0].author.username, author.user.username, "results are hydrated like the feed");
});

test("pages of 10, no repeats, then the end", async () => {
  const w = word("page");
  for (let i = 0; i < 12; i++) await author.post("/api/posts", { content: `${w} number ${i}` });

  const first = await search(author, w);
  assert.equal(first.data.posts.length, 10);
  assert.equal(first.data.nextCursor, "1");
  const second = await search(author, w, first.data.nextCursor);
  assert.equal(second.data.posts.length, 2);
  assert.equal(second.data.nextCursor, null);
  const ids = [...first.data.posts, ...second.data.posts].map((p) => p.id);
  assert.equal(new Set(ids).size, 12);
});

test("private group posts are found only by members; public group posts by everyone", async () => {
  const w = word("priv");
  const secret = (await author.post("/api/groups", { name: "Search Secret", isPrivate: true })).data.group;
  const open = (await author.post("/api/groups", { name: "Search Open" })).data.group;
  await member.post(`/api/groups/${secret.slug}/join`);
  await author.post(`/api/groups/${secret.slug}/members/${member.user.id}/approve`);

  await author.post(`/api/groups/${secret.slug}/posts`, { content: `${w} private plans` });
  await author.post(`/api/groups/${open.slug}/posts`, { content: `${w} public plans` });

  const groupsSeen = async (who) => (await search(who, w)).data.posts.map((p) => p.group?.name).sort();
  assert.deepEqual(await groupsSeen(member), ["Search Open", "Search Secret"]);
  assert.deepEqual(await groupsSeen(outsider), ["Search Open"]);
  assert.deepEqual(await groupsSeen(client(app.base)), ["Search Open"]);
});
