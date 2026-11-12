// Ask Cloudinary for a smaller, modern copy of an uploaded image instead of the full original.
//   https://res.cloudinary.com/<cloud>/image/upload/v123/connectspace/posts/x.jpg
//   → https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_800/v123/connectspace/posts/x.jpg
// f_auto: WebP/AVIF when the browser supports it · q_auto: good-enough quality, much smaller file
// c_limit,w_…: shrink to at most this width (never enlarge). Cloudinary makes each size once and caches it.
// Local uploads (development) are returned unchanged.
export function optimizedImage(src, width) {
  if (!src || !src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) return src;
  return src.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
