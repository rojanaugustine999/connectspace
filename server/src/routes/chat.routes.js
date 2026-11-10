import { Router } from "express";
import * as chat from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { startConversationSchema, messageSchema } from "../validators/chat.schema.js";

const router = Router();
router.use(requireAuth); // every chat route needs a logged-in user

router.get("/", chat.list);
router.post("/", validate(startConversationSchema), chat.start);
router.get("/unread-count", chat.unreadCount); // before "/:id"
router.get("/:id", chat.getOne);
router.get("/:id/messages", chat.messages);
router.post("/:id/messages", validate(messageSchema), chat.send);
router.post("/:id/read", chat.read);

export default router;
