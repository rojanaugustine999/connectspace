import * as userService from "../services/user.service.js";
import { deleteAccount } from "../services/account.service.js";
import { clearAuthCookie } from "../utils/token.js";

// GET /api/users/search?q=ali
export async function search(req, res) {
  const users = await userService.searchUsers(String(req.query.q ?? ""), req.user?.id);
  res.json({ users });
}

// DELETE /api/users/me   { password }
export async function deleteMe(req, res) {
  await deleteAccount(req.user.id, req.body.password);
  clearAuthCookie(res); // log this browser out too
  res.json({ deleted: true });
}

// PATCH /api/users/me
export async function updateMe(req, res) {
  const user = await userService.updateMe(req.user.id, req.body);
  res.json({ user });
}

// GET /api/users/:username
export async function getProfile(req, res) {
  const user = await userService.getProfile(req.params.username.toLowerCase(), req.user?.id);
  res.json({ user });
}

// POST /api/users/:username/follow
export async function follow(req, res) {
  const result = await userService.follow(req.user.id, req.params.username.toLowerCase());
  res.json(result);
}

// DELETE /api/users/:username/follow
export async function unfollow(req, res) {
  const result = await userService.unfollow(req.user.id, req.params.username.toLowerCase());
  res.json(result);
}

// GET /api/users/:username/followers?page=1   and   /following?page=1
export function listConnections(type) {
  return async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const result = await userService.listConnections(req.params.username.toLowerCase(), type, page, req.user?.id);
    res.json(result);
  };
}
