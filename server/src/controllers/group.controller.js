import * as groupService from "../services/group.service.js";

const slugOf = (req) => req.params.slug.toLowerCase();

// GET /api/groups?q=
export async function list(req, res) {
  res.json({ groups: await groupService.listGroups(req.user?.id, String(req.query.q ?? "")) });
}

// GET /api/groups/mine
export async function mine(req, res) {
  res.json({ groups: await groupService.listMyGroups(req.user.id) });
}

// POST /api/groups
export async function create(req, res) {
  res.status(201).json({ group: await groupService.createGroup(req.user.id, req.body) });
}

// GET /api/groups/:slug
export async function getOne(req, res) {
  res.json({ group: await groupService.getGroup(slugOf(req), req.user?.id) });
}

// PATCH /api/groups/:slug
export async function update(req, res) {
  res.json({ group: await groupService.updateGroup(slugOf(req), req.user.id, req.body) });
}

// DELETE /api/groups/:slug
export async function remove(req, res) {
  await groupService.deleteGroup(slugOf(req), req.user.id);
  res.status(204).end();
}

// POST /api/groups/:slug/join      DELETE /api/groups/:slug/join
export async function join(req, res) {
  res.json(await groupService.joinGroup(slugOf(req), req.user.id));
}
export async function leave(req, res) {
  res.json(await groupService.leaveGroup(slugOf(req), req.user.id));
}

// GET /api/groups/:slug/members?status=PENDING
export async function members(req, res) {
  const status = req.query.status === "PENDING" ? "PENDING" : "ACTIVE";
  res.json({ members: await groupService.listMembers(slugOf(req), req.user?.id, status) });
}

// POST /api/groups/:slug/members/:userId/approve
export async function approve(req, res) {
  res.json(await groupService.approveMember(slugOf(req), req.user.id, req.params.userId));
}

// DELETE /api/groups/:slug/members/:userId
export async function removeMember(req, res) {
  res.json(await groupService.removeMember(slugOf(req), req.user.id, req.params.userId));
}

// PATCH /api/groups/:slug/members/:userId  { role }
export async function setRole(req, res) {
  res.json(await groupService.setRole(slugOf(req), req.user.id, req.params.userId, req.body.role));
}

// GET /api/groups/:slug/posts?cursor=    POST /api/groups/:slug/posts
export async function posts(req, res) {
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  res.json(await groupService.listGroupPosts(slugOf(req), req.user?.id, cursor));
}
export async function createPost(req, res) {
  res.status(201).json({ post: await groupService.createGroupPost(slugOf(req), req.user.id, req.body) });
}
