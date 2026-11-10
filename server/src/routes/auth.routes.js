// Routes: which URL + method runs which middleware and controller, in order.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as auth from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { registerSchema, loginSchema } from "../validators/auth.schema.js";

const router = Router();

// Slow down password guessing: max 10 login/register attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again in a few minutes" },
});

//            URL          middleware 1   middleware 2              controller
router.post("/register", authLimiter, validate(registerSchema), auth.register);
router.post("/login", authLimiter, validate(loginSchema), auth.login);
router.post("/logout", auth.logout);
router.get("/me", requireAuth, auth.me);

export default router;
