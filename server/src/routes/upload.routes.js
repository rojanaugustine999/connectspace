// POST /api/uploads/image?folder=avatars|posts   (multipart/form-data, field name "image")
// → { url }   The client then saves that URL, e.g. PATCH /api/users/me { avatarUrl: url }.
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { limiter } from "../middleware/rateLimit.js";
import { httpError } from "../utils/httpError.js";
import { saveImage, MAX_IMAGE_BYTES } from "../services/storage.service.js";

const router = Router();

// Multer reads the multipart body. memoryStorage keeps the file in RAM as a Buffer
// (fine for 5 MB images), so we can inspect it before storing it anywhere.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

// Uploads cost storage and bandwidth: max 30 per 10 minutes per IP.
const uploadLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: "Too many uploads, please wait a few minutes",
});

// Turns multer's errors (e.g. file too big) into our normal { error } responses.
function receiveImage(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(httpError(413, "Images can be at most 5 MB"));
    return next(httpError(400, err.message));
  });
}

const FOLDERS = new Set(["avatars", "posts"]);

router.post("/image", requireAuth, uploadLimiter, receiveImage, async (req, res) => {
  const folder = FOLDERS.has(req.query.folder) ? req.query.folder : "posts";
  const url = await saveImage(req.file, folder);
  res.status(201).json({ url });
});

export default router;
