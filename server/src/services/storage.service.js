// Where uploaded images are stored. Two "drivers", chosen by .env:
//
//   CLOUDINARY_URL set  → Cloudinary (production). Files live on Cloudinary's CDN, so they survive
//                         redeploys. Render's own disk is wiped on every deploy!
//   not set             → local disk (development): server/uploads/, served at /uploads/...
//
// The rest of the app only calls saveImage() and never knows which driver is used.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { httpError } from "../utils/httpError.js";

export const UPLOAD_DIR = path.resolve("uploads");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Never trust the file name or the browser's "Content-Type": both are easy to fake.
// Real image files start with known "magic bytes", so we check the actual content.
function detectImageType(buffer) {
  const b = buffer;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.toString("ascii", 0, 4) === "GIF8") return "gif";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export const storageDriver = () => (process.env.CLOUDINARY_URL ? "cloudinary" : "local");

async function saveToCloudinary(buffer, folder) {
  // The SDK reads CLOUDINARY_URL from the environment automatically.
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `connectspace/${folder}`, resource_type: "image" }, (err, result) =>
        err ? reject(err) : resolve(result.secure_url)
      )
      .end(buffer);
  });
}

async function saveToDisk(buffer, folder, ext) {
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  // Random file name: never use the uploaded name (it could be "../../server.js").
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, name), buffer);
  const base = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${base}/uploads/${folder}/${name}`;
}

// folder: "avatars" | "posts"
export async function saveImage(file, folder) {
  if (!file) throw httpError(400, "Choose an image to upload");
  const ext = detectImageType(file.buffer);
  if (!ext) throw httpError(400, "Only JPG, PNG, GIF or WebP images are allowed");

  try {
    return storageDriver() === "cloudinary"
      ? await saveToCloudinary(file.buffer, folder)
      : await saveToDisk(file.buffer, folder, ext);
  } catch (err) {
    console.error("Image upload failed:", err.message);
    throw httpError(502, "Could not store the image, please try again");
  }
}
