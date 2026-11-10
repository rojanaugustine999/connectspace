// requireAuth: put this in front of any route that needs a logged-in user.
//   router.get("/me", requireAuth, controller)
// It reads the JWT cookie, checks it, and sets req.user = { id }.
import { COOKIE_NAME, verifyToken } from "../utils/token.js";
import { httpError } from "../utils/httpError.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw httpError(401, "Please log in");

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub };
  } catch {
    throw httpError(401, "Your session has expired, please log in again");
  }
  next();
}

// optionalAuth: for pages anyone can see, but which show more when you're logged in
// (e.g. a profile shows a "Following" button only if we know who you are).
// Sets req.user when the cookie is valid, otherwise just continues with req.user = undefined.
export function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      req.user = { id: verifyToken(token).sub };
    } catch {
      // invalid/expired token: treat as logged out
    }
  }
  next();
}
