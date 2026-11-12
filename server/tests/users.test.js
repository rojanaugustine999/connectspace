import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, newUser } from "./helpers.js";

let app, alice, bob;
before(async () => {
  app = await startServer();
  alice = await newUser(app.base, "Alice Test");
  bob = await newUser(app.base, "Bob Test");
});
after(async () => app.stop());

test("public profile works logged out and never shows the email", async () => {
  const r = await client(app.base).get(`/api/users/${alice.user.username}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.user.username, alice.user.username);
  assert.ok(!("email" in r.data.user));
  assert.equal(r.data.user.isMe, false);
});

test("unknown user → 404", async () => {
  assert.equal((await client(app.base).get("/api/users/nobody_here_404")).status, 404);
});

test("follow: needs login, counts once, can't follow yourself, unfollow undoes it", async () => {
  const path = `/api/users/${alice.user.username}/follow`;
  assert.equal((await client(app.base).post(path)).status, 401);

  const first = await bob.post(path);
  assert.equal(first.status, 200);
  assert.equal(first.data.isFollowing, true);
  assert.equal(first.data.followerCount, 1);
  assert.equal((await bob.post(path)).data.followerCount, 1, "following twice must not double count");

  assert.equal((await alice.post(path)).status, 400, "can't follow yourself");

  const profile = await bob.get(`/api/users/${alice.user.username.toUpperCase()}`);
  assert.equal(profile.data.user.isFollowing, true);

  const followers = await bob.get(`${path.replace("/follow", "/followers")}`);
  assert.ok(followers.data.users.some((u) => u.username === bob.user.username));

  const un = await bob.del(path);
  assert.equal(un.data.isFollowing, false);
  assert.equal(un.data.followerCount, 0);
});

test("follow notification: actor name merged in from PostgreSQL, no duplicates on re-follow, mark as read", async () => {
  const path = `/api/users/${alice.user.username}/follow`;
  await bob.post(path);
  await bob.del(path);
  await bob.post(path);

  const r = await alice.get("/api/notifications");
  const fromBob = r.data.notifications.filter((n) => n.type === "follow" && n.actor.username === bob.user.username);
  assert.equal(fromBob.length, 1);
  assert.equal(fromBob[0].actor.name, "Bob Test");
  assert.ok(r.data.unreadCount > 0);

  await alice.patch("/api/notifications/read");
  assert.equal((await alice.get("/api/notifications/unread-count")).data.unreadCount, 0);
});

test("search is case-insensitive and includes follow state", async () => {
  const term = alice.user.username.slice(0, 6).toUpperCase();
  const r = await bob.get(`/api/users/search?q=${term}`);
  const hit = r.data.users.find((u) => u.username === alice.user.username);
  assert.ok(hit);
  assert.equal(typeof hit.isFollowing, "boolean");
});

test("profile update: validates, and ignores fields you may not change (mass assignment)", async () => {
  assert.equal((await alice.patch("/api/users/me", { bio: "x".repeat(200) })).status, 400);
  const r = await alice.patch("/api/users/me", { bio: "Hello", email: "hacker@evil.test", password: "x" });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.bio, "Hello");
  assert.equal(r.data.user.email, alice.user.email);
  assert.equal((await client(app.base).patch("/api/users/me", { bio: "x" })).status, 401);
});
