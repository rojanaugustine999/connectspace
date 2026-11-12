import { Router } from "express";
import * as posts from "../controllers/post.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { createPostSchema, createCommentSchema } from "../validators/post.schema.js";

const router = Router();

router.post("/", requireAuth, validate(createPostSchema), posts.create);

// These must come before "/:id", otherwise "feed" would be treated as a post id.
router.get("/feed", requireAuth, posts.feed);
router.get("/explore", optionalAuth, posts.explore);
router.get("/search", optionalAuth, posts.search);

// Every route below has :id → check it's a valid MongoDB id once, for all of them.
router.param("id", validateObjectId("id"));

router.get("/:id", optionalAuth, posts.getOne);
router.delete("/:id", requireAuth, posts.remove);

router.post("/:id/like", requireAuth, posts.like);
router.delete("/:id/like", requireAuth, posts.unlike);

router.get("/:id/comments", optionalAuth, posts.listComments);
router.post("/:id/comments", requireAuth, validate(createCommentSchema), posts.addComment);
router.delete("/:id/comments/:commentId", requireAuth, validateObjectId("commentId"), posts.deleteComment);

export default router;
