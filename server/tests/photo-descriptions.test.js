import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, newUser } from "./helpers.js";

let app, author;
before(async () => {
  app = await startServer();
  author = await newUser(app.base, "Author");
});
after(async () => app.stop());

const A = "https://example.com/a.png";
const B = "https://example.com/b.png";

test("photos can have descriptions, in the same order; missing ones are empty", async () => {
  const r = await author.post("/api/posts", { content: "Two photos", images: [A, B], imageDescriptions: ["  A blue macaw  "] });
  assert.equal(r.status, 201);
  assert.deepEqual(r.data.post.images, [A, B]);
  assert.deepEqual(r.data.post.imageDescriptions, ["A blue macaw", ""], "trimmed, and padded for the second photo");

  const fetched = (await author.get(`/api/posts/${r.data.post.id}`)).data.post;
  assert.deepEqual(fetched.imageDescriptions, ["A blue macaw", ""]);
});

test("descriptions are checked", async () => {
  const tooMany = await author.post("/api/posts", { content: "x", images: [A], imageDescriptions: ["one", "two"] });
  assert.equal(tooMany.status, 400);
  assert.ok(tooMany.data.details.imageDescriptions);

  const noPhotos = await author.post("/api/posts", { content: "x", imageDescriptions: ["orphan"] });
  assert.equal(noPhotos.status, 400);

  const tooLong = await author.post("/api/posts", { content: "x", images: [A], imageDescriptions: ["x".repeat(201)] });
  assert.equal(tooLong.status, 400);
});

test("works in groups, survives an edit, and older posts without descriptions still load", async () => {
  const g = (await author.post("/api/groups", { name: "Alt Text Club" })).data.group;
  const gp = await author.post(`/api/groups/${g.slug}/posts`, { content: "Group photo", images: [A], imageDescriptions: ["Group selfie"] });
  assert.deepEqual(gp.data.post.imageDescriptions, ["Group selfie"]);

  const edited = await author.patch(`/api/posts/${gp.data.post.id}`, { content: "Group photo, edited" });
  assert.deepEqual(edited.data.post.imageDescriptions, ["Group selfie"], "editing the text keeps the descriptions");

  // A post saved before this feature existed has no imageDescriptions field at all.
  const { Post } = await import("../src/models/Post.js");
  const old = await Post.collection.insertOne({
    authorId: author.user.id, groupId: null, content: "Old post", images: [A, B], likeCount: 0, commentCount: 0,
    createdAt: new Date(), updatedAt: new Date(),
  });
  const r = await author.get(`/api/posts/${old.insertedId}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.post.imageDescriptions, ["", ""]);
});
