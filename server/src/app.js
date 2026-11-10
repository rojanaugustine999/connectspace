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

const app = express();

// 1. Middleware: runs on every request, in this order.
app.use(helmet()); // security headers
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); // allow the Next.js app to call us with cookies
app.use(express.json()); // parse JSON bodies into req.body
app.use(cookieParser()); // parse cookies into req.cookies (used for the JWT in Week 2)
app.use(morgan("dev")); // log each request in the terminal

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
