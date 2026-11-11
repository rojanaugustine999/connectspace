// app.js builds the Express app: middleware first, then routes, then error handlers.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import postRoutes from "./routes/post.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import groupRoutes from "./routes/group.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { UPLOAD_DIR } from "./services/storage.service.js";
import { clientIp } from "./utils/clientIp.js";

const app = express();

// Behind proxies every request seems to come from the last proxy. "trust proxy" tells Express how many
// to skip so req.ip is the caller. On Render, direct calls pass Render's edge network + load balancer
// (3, measured with the rate-limit headers). Website traffic arrives via Vercel and carries the
// visitor IP + PROXY_SECRET instead (see utils/clientIp.js).
// Leave it unset (0) in development: there's no proxy, and trusting one would let anyone fake their IP.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));
app.disable("x-powered-by"); // don't advertise "Express" in response headers

// 1. Middleware: runs on every request, in this order.
app.use(helmet()); // security headers
// Only Socket.io and direct API calls need CORS now: the website itself calls /api through the Next.js proxy.
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "100kb" })); // parse JSON bodies into req.body (and refuse huge ones)
app.use(cookieParser()); // parse cookies into req.cookies (used for the JWT in Week 2)
// Request logs. Log the real visitor IP instead of the last proxy's address.
morgan.token("remote-addr", (req) => clientIp(req));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// 2. Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/conversations", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/uploads", uploadRoutes);

// Locally stored images (development only; production uses Cloudinary).
// helmet() blocks other sites from loading our files by default, but the Next.js app runs on a
// different origin (localhost:3000), so images need "Cross-Origin-Resource-Policy: cross-origin".
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// 3. Error handling (always last)
app.use(notFound);
app.use(errorHandler);

export default app;
