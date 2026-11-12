import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, newUser } from "./helpers.js";
import { extractMentions, MAX_MENTIONS } from "../src/services/mention.service.js";

let app, author, bob, carol, outsider;
before(async () => {
  app = await startServer();
  [author, bob, carol, outsider] = await Promise.all([
    newUser(app.base, "Author"),
    newUser(app.base, "Bob"),
    newUser(app.base, "Carol"),
    newUser(app.base, "Outsider"),
  ]);
});
after(async () => app.stop());

const mentionsFor = async (who, postId) =>
  (await who.get("/api/notifications")).data.notifications.filter((n) => n.type === "mention" && (!postId || n.postId === postId));

test("finding mentions: usernames only, no emails, no duplicates, capped", () => {
  assert.deepEqual(extractMentions("Hi @Alice and @alice, mail me@example.com or @bo (too short)"), ["alice"]);
  assert.deepEqual(extractMentions("(@bob_1) @carol!\n@dave_d."), ["bob_1", "carol", "dave_d"]);
  const many = Array.from({ length: 15 }, (_, i) => `@user_${i}`).join(" ");
  assert.equal(extractMentions(many).length, MAX_MENTIONS);
});

test("a post notifies the real people it mentions, not unknown names or yourself", async () => {
  const text = `Thanks @${bob.user.username} and @${carol.user.username.toUpperCase()}! cc @nobody_here @${author.user.username}`;
  const post = (await author.post("/api/posts", { content: text })).data.post;

  const [b] = await mentionsFor(bob, post.id);
  assert.equal(b.actor.username, author.user.username);
  assert.equal((await mentionsFor(carol, post.id)).length, 1, "case doesn't matter");
  assert.equal((await mentionsFor(author, post.id)).length, 0, "no notification for mentioning yourself");
});

test("comments: mentioned people are notified; the post author only gets 'commented'", async () => {
  const post = (await author.post("/api/posts", { content: "Question for everyone" })).data.post;
  await bob.post(`/api/posts/${post.id}/comments`, { content: `@${author.user.username} @${carol.user.username} what do you think?` });

  assert.equal((await mentionsFor(carol, post.id)).length, 1);
  const forAuthor = (await author.get("/api/notifications")).data.notifications.filter((n) => n.postId === post.id);
  assert.deepEqual(forAuthor.map((n) => n.type), ["comment"]);
});

test("private groups: only members are notified (outsiders can't see the post)", async () => {
  const g = (await author.post("/api/groups", { name: "Mention Club", isPrivate: true })).data.group;
  await bob.post(`/api/groups/${g.slug}/join`);
  await author.post(`/api/groups/${g.slug}/members/${bob.user.id}/approve`);

  const post = (
    await author.post(`/api/groups/${g.slug}/posts`, { content: `@${bob.user.username} @${outsider.user.username} secret plans` })
  ).data.post;

  assert.equal((await mentionsFor(bob, post.id)).length, 1);
  assert.equal((await mentionsFor(outsider, post.id)).length, 0);
});
