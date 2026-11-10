import { Router } from "express";
import * as groups from "../controllers/group.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createGroupSchema, updateGroupSchema, setRoleSchema } from "../validators/group.schema.js";
import { createPostSchema } from "../validators/post.schema.js";

const router = Router();

router.get("/", optionalAuth, groups.list);
router.get("/mine", requireAuth, groups.mine); // before "/:slug"
router.post("/", requireAuth, validate(createGroupSchema), groups.create);

router.get("/:slug", optionalAuth, groups.getOne);
router.patch("/:slug", requireAuth, validate(updateGroupSchema), groups.update);
router.delete("/:slug", requireAuth, groups.remove);

router.post("/:slug/join", requireAuth, groups.join);
router.delete("/:slug/join", requireAuth, groups.leave);

router.get("/:slug/members", optionalAuth, groups.members);
router.post("/:slug/members/:userId/approve", requireAuth, groups.approve);
router.patch("/:slug/members/:userId", requireAuth, validate(setRoleSchema), groups.setRole);
router.delete("/:slug/members/:userId", requireAuth, groups.removeMember);

router.get("/:slug/posts", optionalAuth, groups.posts);
router.post("/:slug/posts", requireAuth, validate(createPostSchema), groups.createPost);

export default router;
