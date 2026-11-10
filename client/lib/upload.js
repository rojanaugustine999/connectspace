// Upload one image: POST /api/uploads/image (multipart/form-data) → { url }
// api() sends JSON, so uploads use fetch + FormData directly.
// Don't set Content-Type yourself: the browser adds it with the multipart "boundary".
const API_URL = ""; // same site: next.config.mjs proxies /api/* to the Express API

export const MAX_IMAGE_MB = 5;
const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function uploadImage(file, folder = "posts") {
  // Quick checks in the browser for a friendly message. The server checks again (for real).
  if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG, GIF or WebP images");
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Images can be at most ${MAX_IMAGE_MB} MB`);

  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_URL}/api/uploads/image?folder=${folder}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}
