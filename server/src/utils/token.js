// JWT helpers. The token is stored in an httpOnly cookie:
// - httpOnly: JavaScript in the browser can't read it, so an XSS bug can't steal it
// - the browser sends it automatically with every request (fetch with credentials: "include")
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signToken(userId) {
  // "sub" (subject) is the standard JWT field for "who this token is about".
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET); // throws if invalid or expired
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // In production the frontend (Vercel) and API (Render) are on different sites,
    // which needs sameSite "none" + secure (HTTPS). Locally both are on localhost, so "lax" works.
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };
}

export function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}
