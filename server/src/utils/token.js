// JWT helpers.
//
// 1. Session token: stored in an httpOnly cookie, valid 7 days.
//    - httpOnly: JavaScript in the browser can't read it, so an XSS bug can't steal it
//    - the browser sends it automatically with every /api request
//
// 2. Socket token: valid 2 minutes, only good for opening a Socket.io connection.
//    In production the socket connects straight to the API's domain (Vercel can't proxy
//    WebSockets), where our cookie isn't sent. So the app first asks GET /api/auth/socket-token
//    (through the proxy, logged in with the cookie) and hands this short-lived token to the socket.
//
// The "typ" field keeps the two apart: a socket token can't be used as a session and vice versa.
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signToken(userId) {
  // "sub" (subject) is the standard JWT field for "who this token is about".
  return jwt.sign({ sub: userId, typ: "session" }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function signSocketToken(userId) {
  return jwt.sign({ sub: userId, typ: "socket" }, process.env.JWT_SECRET, { expiresIn: "2m" });
}

// Throws if the token is invalid, expired, or the wrong type.
export function verifyToken(token, typ = "session") {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  // Tokens from before this change have no typ; treat those as sessions.
  if ((payload.typ ?? "session") !== typ) throw new Error("Wrong token type");
  return payload;
}

function cookieOptions() {
  return {
    httpOnly: true,
    // The browser only talks to our own site (Next.js proxies /api/*), so the cookie is first-party
    // and "lax" is enough. "lax" also blocks the cookie on cross-site form posts (CSRF protection).
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // HTTPS-only in production
    path: "/",
  };
}

export function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}
