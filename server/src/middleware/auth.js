// requireAuth: put this in front of any route that needs a logged-in user.
//   router.get("/me", requireAuth, controller)
// It reads the JWT cookie, checks it, and sets req.user = { id }.
import { COOKIE_NAME, verifyToken } from "../utils/token.js";
import { httpError } from "../utils/httpError.js";
import { prisma } from "../config/prisma.js";

// A login token stays valid for 7 days, even if the account is deleted in the meantime (for
// example from another device). So we also check that the account still exists: one quick
// lookup by primary key.
export async function accountExists(id) {
  return Boolean(await prisma.user.findUnique({ where: { id }, select: { id: true } }));
}

function userIdFromCookie(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return { token: null, id: null };
  try {
    return { token, id: verifyToken(token).sub };
  } catch {
    return { token, id: null }; // invalid or expired
  }
}

export async function requireAuth(req, res, next) {
  const { token, id } = userIdFromCookie(req);
  if (!token) throw httpError(401, "Please log in");
  if (!id) throw httpError(401, "Your session has expired, please log in again");
  if (!(await accountExists(id))) throw httpError(401, "This account no longer exists");
  req.user = { id };
  next();
}

// optionalAuth: for pages anyone can see, but which show more when you're logged in
// (e.g. a profile shows a "Following" button only if we know who you are).
// Sets req.user when the cookie is valid, otherwise just continues with req.user = undefined.
export async function optionalAuth(req, res, next) {
  const { id } = userIdFromCookie(req);
  if (id && (await accountExists(id))) req.user = { id };
  next();
}
