// Deleting an account: everything the person owned goes, in both databases and the image store,
// and everyone else's data stays correct (counts, group owners, their own posts).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { io as connect } from "socket.io-client";
import { startServer, client, newUser, PASSWORD, wait } from "./helpers.js";

let app, victim, friend, admin, member, stranger;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function upload(c) {
  const form = new FormData();
  form.append("image", new Blob([PNG], { type: "image/png" }), "x.png");
  const res = await fetch(`${app.base}/api/uploads/image?folder=posts`, {
    method: "POST",
    headers: { Cookie: c.cookie, "x-proxy-secret": process.env.PROXY_SECRET, "x-client-ip": c.ip },
    body: form,
  });
  return (await res.json()).url;
}

before(async () => {
  app = await startServer();
  process.env.PUBLIC_API_URL = app.base;
  [victim, friend, admin, member, stranger] = await Promise.all(
    ["Victim", "Friend", "Admin", "Member", "Stranger"].map((n) => newUser(app.base, n))
  );
});
after(async () => app.stop());

test("needs the right password; nothing is deleted on a wrong one", async () => {
  assert.equal((await client(app.base).del("/api/users/me", { password: PASSWORD })).status, 401);
  assert.equal((await victim.del("/api/users/me", {})).status, 400);
  const wrong = await victim.del("/api/users/me", { password: "not-my-password" });
  assert.equal(wrong.status, 403);
  assert.equal((await victim.get("/api/auth/me")).status, 200, "still logged in");
});

test("deleting an account removes everything it owned, and fixes everyone else's data", async () => {
  // ---------- build up a life on the site ----------
  const photo = await upload(victim);
  const myPost = (await victim.post("/api/posts", { content: "My post", images: [photo] })).data.post;
  await friend.post(`/api/posts/${myPost.id}/like`);
  await friend.post(`/api/posts/${myPost.id}/comments`, { content: "on victim's post" });

  const friendPost = (await friend.post("/api/posts", { content: "Friend's post" })).data.post;
  await victim.post(`/api/posts/${friendPost.id}/like`);
  await friend.post(`/api/posts/${friendPost.id}/like`);
  const myComment = (await victim.post(`/api/posts/${friendPost.id}/comments`, { content: "victim's comment" })).data.comment;
  await friend.post(`/api/posts/${friendPost.id}/comments`, { content: "reply to victim", parentId: myComment.id });
  await friend.post(`/api/posts/${friendPost.id}/comments`, { content: "friend's own comment" });

  await victim.post(`/api/users/${friend.user.username}/follow`);
  await friend.post(`/api/users/${victim.user.username}/follow`);

  // A group with an admin and a member (should pass to the admin), a group with nobody else
  // (should be deleted), and someone else's group the victim is just a member of.
  const shared = (await victim.post("/api/groups", { name: "Victim Shared" })).data.group;
  await admin.post(`/api/groups/${shared.slug}/join`);
  await member.post(`/api/groups/${shared.slug}/join`);
  await victim.patch(`/api/groups/${shared.slug}/members/${admin.user.id}`, { role: "ADMIN" });
  const sharedPost = (await member.post(`/api/groups/${shared.slug}/posts`, { content: "member's post stays" })).data.post;

  const lonely = (await victim.post("/api/groups", { name: "Victim Alone" })).data.group;
  const lonelyPost = (await victim.post(`/api/groups/${lonely.slug}/posts`, { content: "gone with the group" })).data.post;

  const others = (await friend.post("/api/groups", { name: "Friend's Group" })).data.group;
  await victim.post(`/api/groups/${others.slug}/join`);

  const conv = (await victim.post("/api/conversations", { username: friend.user.username })).data.conversation;
  await victim.post(`/api/conversations/${conv.id}/messages`, { text: "hello" });
  await friend.post(`/api/conversations/${conv.id}/messages`, { text: "hi back" });

  // An open live connection, which should be closed by the deletion.
  const socket = connect(app.base, { transports: ["websocket"], reconnection: false, extraHeaders: { Cookie: victim.cookie } });
  await new Promise((resolve, reject) => (socket.on("connect", resolve), socket.on("connect_error", reject)));
  let disconnected = false;
  socket.on("disconnect", () => (disconnected = true));

  // ---------- delete ----------
  const oldCookie = victim.cookie; // keep it: the response clears it from this test client's cookie jar
  const r = await victim.del("/api/users/me", { password: PASSWORD });
  assert.equal(r.status, 200);
  assert.match(r.setCookie ?? "", /token=;/, "this browser is logged out");
  await wait(300);
  assert.ok(disconnected, "live connections are closed");

  // ---------- the account is gone ----------
  victim.cookie = oldCookie; // like a second device that's still logged in
  assert.equal((await victim.get("/api/auth/me")).status, 401, "an old login cookie no longer works");
  assert.equal((await victim.post("/api/posts", { content: "ghost post" })).status, 401);
  assert.equal((await client(app.base).post("/api/auth/login", { email: victim.user.email, password: PASSWORD })).status, 401);
  assert.equal((await friend.get(`/api/users/${victim.user.username}`)).status, 404);
  await assert.rejects(
    new Promise((resolve, reject) => {
      const s = connect(app.base, { transports: ["websocket"], reconnection: false, extraHeaders: { Cookie: victim.cookie } });
      s.on("connect", () => (s.close(), resolve()));
      s.on("connect_error", (e) => (s.close(), reject(e)));
    }),
    /unauthorized/
  );

  // ---------- their content is gone, everyone else's counts are right ----------
  assert.equal((await friend.get(`/api/posts/${myPost.id}`)).status, 404);
  const fp = (await friend.get(`/api/posts/${friendPost.id}`)).data.post;
  assert.equal(fp.likeCount, 1, "only the friend's own like is left");
  assert.equal(fp.commentCount, 1, "victim's comment and the reply to it are gone");
  const comments = (await friend.get(`/api/posts/${friendPost.id}/comments`)).data.comments;
  assert.deepEqual(comments.map((c) => c.content), ["friend's own comment"]);

  const friendProfile = (await friend.get(`/api/users/${friend.user.username}`)).data.user;
  assert.equal(friendProfile.followerCount, 0);
  assert.equal(friendProfile.followingCount, 0);

  // ---------- groups ----------
  const sharedNow = (await admin.get(`/api/groups/${shared.slug}`)).data.group;
  assert.equal(sharedNow.myRole, "OWNER", "the admin took over");
  assert.equal(sharedNow.memberCount, 2);
  assert.equal((await member.get(`/api/posts/${sharedPost.id}`)).status, 200, "other members' posts stay");
  assert.equal((await friend.get(`/api/groups/${lonely.slug}`)).status, 404, "a group with nobody left is deleted");
  const { Post } = await import("../src/models/Post.js");
  assert.equal(await Post.countDocuments({ _id: lonelyPost.id }), 0);
  assert.equal((await friend.get(`/api/groups/${others.slug}`)).data.group.memberCount, 1);

  // ---------- chats, notifications and the photo ----------
  assert.equal((await friend.get("/api/conversations")).data.conversations.length, 0);
  const { Message } = await import("../src/models/Message.js");
  assert.equal(await Message.countDocuments({ conversationId: conv.id }), 0);
  const notes = (await friend.get("/api/notifications")).data.notifications;
  assert.ok(!notes.some((n) => n.actor?.id === victim.user.id), "no notifications from the deleted account");
  const { UPLOAD_DIR } = await import("../src/services/storage.service.js");
  assert.equal(fs.existsSync(path.join(UPLOAD_DIR, photo.split("/uploads/")[1])), false, "the photo file is deleted");

  // Someone who never interacted is unaffected.
  assert.equal((await stranger.get("/api/auth/me")).status, 200);
});

test("deleting a post also deletes its photo", async () => {
  const photo = await upload(friend);
  const post = (await friend.post("/api/posts", { content: "with a photo", images: [photo] })).data.post;
  assert.equal((await friend.del(`/api/posts/${post.id}`)).status, 204);
  const { UPLOAD_DIR } = await import("../src/services/storage.service.js");
  assert.equal(fs.existsSync(path.join(UPLOAD_DIR, photo.split("/uploads/")[1])), false);
});
