import { Router } from "express";
import * as users from "../controllers/user.controller.js";
import * as posts from "../controllers/post.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema } from "../validators/user.schema.js";

const router = Router();

// Order matters: "/search" and "/me" must come BEFORE "/:username",
// otherwise Express would treat "search" as a username.
router.get("/search", optionalAuth, users.search);
router.patch("/me", requireAuth, validate(updateProfileSchema), users.updateMe);

router.get("/:username", optionalAuth, users.getProfile);
router.post("/:username/follow", requireAuth, users.follow);
router.delete("/:username/follow", requireAuth, users.unfollow);
router.get("/:username/followers", optionalAuth, users.listConnections("followers"));
router.get("/:username/following", optionalAuth, users.listConnections("following"));
router.get("/:username/posts", optionalAuth, posts.listByUser);

export default router;
