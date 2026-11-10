import * as postService from "../services/post.service.js";

// POST /api/posts
export async function create(req, res) {
  const post = await postService.createPost(req.user.id, req.body);
  res.status(201).json({ post });
}

// GET /api/posts/:id
export async function getOne(req, res) {
  res.json({ post: await postService.getPost(req.params.id, req.user?.id) });
}

// DELETE /api/posts/:id
export async function remove(req, res) {
  await postService.deletePost(req.params.id, req.user.id);
  res.status(204).end(); // 204 No Content: it worked, nothing to send back
}

// POST /api/posts/:id/like     DELETE /api/posts/:id/like
export async function like(req, res) {
  res.json(await postService.likePost(req.params.id, req.user.id));
}
export async function unlike(req, res) {
  res.json(await postService.unlikePost(req.params.id, req.user.id));
}

// GET /api/posts/:id/comments
export async function listComments(req, res) {
  res.json({ comments: await postService.listComments(req.params.id, req.user?.id) });
}

// POST /api/posts/:id/comments
export async function addComment(req, res) {
  const result = await postService.addComment(req.params.id, req.user.id, req.body);
  res.status(201).json(result);
}

// DELETE /api/posts/:id/comments/:commentId
export async function deleteComment(req, res) {
  res.json(await postService.deleteComment(req.params.id, req.params.commentId, req.user.id));
}

const cursorOf = (req) => (req.query.cursor ? String(req.query.cursor) : undefined);

// GET /api/users/:username/posts?cursor=...
export async function listByUser(req, res) {
  res.json(await postService.listUserPosts(req.params.username.toLowerCase(), req.user?.id, cursorOf(req)));
}

// GET /api/posts/feed?cursor=...
export async function feed(req, res) {
  res.json(await postService.getFeed(req.user.id, cursorOf(req)));
}

// GET /api/posts/explore?cursor=...
export async function explore(req, res) {
  res.json(await postService.getExplore(req.user?.id, cursorOf(req)));
}
