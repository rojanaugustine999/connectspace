// Controllers: read the request, call a service, send the response. Nothing more.
// Express 5 passes errors thrown in async functions to errorHandler automatically.
import * as authService from "../services/auth.service.js";
import { setAuthCookie, clearAuthCookie } from "../utils/token.js";

// POST /api/auth/register
export async function register(req, res) {
  const user = await authService.register(req.body);
  setAuthCookie(res, user.id); // logged in straight after sign-up
  res.status(201).json({ user });
}

// POST /api/auth/login
export async function login(req, res) {
  const user = await authService.login(req.body);
  setAuthCookie(res, user.id);
  res.json({ user });
}

// POST /api/auth/logout
export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
}

// GET /api/auth/me  (requireAuth runs first and sets req.user)
export async function me(req, res) {
  const user = await authService.getUserById(req.user.id);
  res.json({ user });
}
