import { Router } from "express";
import * as users from "../controllers/user.controller.js";
import * as posts from "../controllers/post.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { limiter } from "../middleware/rateLimit.js";
import { updateProfileSchema, deleteAccountSchema } from "../validators/user.schema.js";

const router = Router();

// Order matters: "/search" and "/me" must come BEFORE "/:username",
// otherwise Express would treat "search" as a username.
router.get("/search", optionalAuth, users.search);
router.patch("/me", requireAuth, validate(updateProfileSchema), users.updateMe);
// Asks for the password, so it's rate-limited like login: no guessing passwords through this door.
const deleteLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 10, message: "Too many attempts, please try again in a few minutes" });
router.delete("/me", requireAuth, deleteLimiter, validate(deleteAccountSchema), users.deleteMe);

router.get("/:username", optionalAuth, users.getProfile);
router.post("/:username/follow", requireAuth, users.follow);
router.delete("/:username/follow", requireAuth, users.unfollow);
router.get("/:username/followers", optionalAuth, users.listConnections("followers"));
router.get("/:username/following", optionalAuth, users.listConnections("following"));
router.get("/:username/posts", optionalAuth, posts.listByUser);

export default router;
