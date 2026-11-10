import { Router } from "express";
import * as notifications from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Every notification route needs a logged-in user, so apply requireAuth to the whole router.
router.use(requireAuth);

router.get("/", notifications.list);
router.get("/unread-count", notifications.unreadCount);
router.patch("/read", notifications.markAllRead);

export default router;
