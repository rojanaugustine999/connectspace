import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startServer, client, newUser } from "./helpers.js";

let app, owner, member, outsider;
const uploaded = [];

before(async () => {
  app = await startServer();
  process.env.PUBLIC_API_URL = app.base; // so local upload URLs point at this test server
  [owner, member, outsider] = await Promise.all([newUser(app.base, "Owner"), newUser(app.base, "Member"), newUser(app.base, "Outsider")]);
});
after(async () => {
  const { UPLOAD_DIR } = await import("../src/services/storage.service.js");
  for (const url of uploaded) fs.rmSync(path.join(UPLOAD_DIR, url.split("/uploads/")[1]), { force: true });
  await app.stop();
});

test("create: validated, unique slugs, creator becomes owner", async () => {
  assert.equal((await owner.post("/api/groups", { name: "ab" })).status, 400);
  const g = (await owner.post("/api/groups", { name: "Design Club!" })).data.group;
  assert.match(g.slug, /^design-club/);
  assert.equal(g.myRole, "OWNER");
  assert.equal(g.memberCount, 1);
  const again = (await member.post("/api/groups", { name: "Design Club!" })).data.group;
  assert.notEqual(again.slug, g.slug);
});

test("private groups: join requests, hidden posts (404 everywhere), approval", async () => {
  const g = (await owner.post("/api/groups", { name: "Secret Club", isPrivate: true })).data.group;
  assert.equal((await member.post(`/api/groups/${g.slug}/join`)).data.status, "PENDING");
  assert.equal((await member.post(`/api/groups/${g.slug}/posts`, { content: "can I?" })).status, 403);

  const secret = (await owner.post(`/api/groups/${g.slug}/posts`, { content: "Top secret" })).data.post;
  assert.equal((await member.get(`/api/groups/${g.slug}/posts`)).status, 403);
  assert.equal((await outsider.get(`/api/posts/${secret.id}`)).status, 404);
  assert.equal((await outsider.post(`/api/posts/${secret.id}/like`)).status, 404);
  assert.equal((await client(app.base).get(`/api/posts/${secret.id}/comments`)).status, 404);

  for (const [who, url] of [
    [outsider, `/api/users/${owner.user.username}/posts`],
    [owner, "/api/posts/feed"],
    [client(app.base), "/api/posts/explore"],
  ]) {
    const r = await who.get(url);
    assert.ok(!r.data.posts.some((p) => p.id === secret.id), `leaked into ${url}`);
  }

  assert.equal((await member.get(`/api/groups/${g.slug}/members?status=PENDING`)).status, 403);
  assert.equal((await owner.get(`/api/groups/${g.slug}`)).data.group.pendingCount, 1);
  assert.equal((await owner.post(`/api/groups/${g.slug}/members/${member.user.id}/approve`)).data.status, "ACTIVE");
  assert.equal((await member.get(`/api/posts/${secret.id}`)).status, 200);
});

test("roles: only the owner manages roles; admins moderate members but not the owner", async () => {
  const g = (await owner.post("/api/groups", { name: "Roles Group" })).data.group;
  await member.post(`/api/groups/${g.slug}/join`);
  await outsider.post(`/api/groups/${g.slug}/join`);

  assert.equal((await member.patch(`/api/groups/${g.slug}/members/${outsider.user.id}`, { role: "ADMIN" })).status, 403);
  assert.equal((await owner.patch(`/api/groups/${g.slug}/members/${member.user.id}`, { role: "ADMIN" })).data.role, "ADMIN");
  assert.equal((await owner.patch(`/api/groups/${g.slug}/members/${outsider.user.id}`, { role: "OWNER" })).status, 400);

  const spam = (await outsider.post(`/api/groups/${g.slug}/posts`, { content: "spam" })).data.post;
  const asAdmin = await member.get(`/api/groups/${g.slug}/posts`);
  assert.equal(asAdmin.data.posts.find((p) => p.id === spam.id).canDelete, true);
  assert.equal((await member.del(`/api/posts/${spam.id}`)).status, 204);

  assert.equal((await member.del(`/api/groups/${g.slug}/members/${outsider.user.id}`)).data.removed, true);
  assert.equal((await member.del(`/api/groups/${g.slug}/members/${owner.user.id}`)).status, 403);
  assert.equal((await owner.del(`/api/groups/${g.slug}/join`)).status, 400, "the owner can't leave");
  assert.equal((await member.del(`/api/groups/${g.slug}`)).status, 403, "admins can't delete the group");
});

test("deleting a group removes its posts", async () => {
  const g = (await owner.post("/api/groups", { name: "Short Lived" })).data.group;
  const post = (await owner.post(`/api/groups/${g.slug}/posts`, { content: "bye" })).data.post;
  assert.equal((await owner.del(`/api/groups/${g.slug}`)).status, 204);
  const { Post } = await import("../src/models/Post.js");
  assert.equal(await Post.countDocuments({ _id: post.id }), 0);
});

// A real 1×1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function upload(c, bytes, name = "x.png") {
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), name);
  const res = await fetch(`${app.base}/api/uploads/image?folder=posts`, {
    method: "POST",
    headers: { ...(c?.cookie && { Cookie: c.cookie }), "x-proxy-secret": process.env.PROXY_SECRET, "x-client-ip": c?.ip ?? "10.9.9.9" },
    body: form,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

test("uploads: real images only, size limit, safe file names, served cross-origin", async () => {
  assert.equal((await upload(null, PNG)).status, 401);

  const ok = await upload(owner, PNG, "../../../src/server.js");
  assert.equal(ok.status, 201);
  assert.ok(!ok.data.url.includes(".."));
  uploaded.push(ok.data.url);
  const img = await fetch(ok.data.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/png");
  assert.equal(img.headers.get("cross-origin-resource-policy"), "cross-origin");

  assert.equal((await upload(owner, Buffer.from("<script>alert(1)</script> not a png"), "evil.png")).status, 400);
  assert.equal((await upload(owner, Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]))).status, 413);
});
