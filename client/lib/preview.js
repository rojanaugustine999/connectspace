// Link previews (the card WhatsApp, LinkedIn, Slack… show for a shared link).
// Preview bots don't run JavaScript, so the page's <head> must already contain the post's
// title and photo when the HTML is sent. These helpers run on the WEBSITE's server
// (generateMetadata in app/p/[id]/layout.js and app/u/[username]/layout.js).
//
// Rules:
//   - Always ask the API as a logged-out visitor (no cookie). A private group post answers 404,
//     so its text can never leak into a preview: it gets the generic ConnectSpace card.
//   - Give up after 3 seconds. The free API can take ~55 s to wake up; a visitor shouldn't wait
//     that long for a preview, so we fall back to the generic card instead.
//   - Cache answers for 60 s, so a link shared in a busy group chat doesn't hit the API every time.
import { optimizedImage } from "@/lib/image";

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";

export async function fetchPublic(path) {
  try {
    const res = await fetch(`${API_ORIGIN}${path}`, { signal: AbortSignal.timeout(3000), next: { revalidate: 60 } });
    return res.ok ? await res.json() : null;
  } catch {
    return null; // timeout, API asleep or down → generic preview
  }
}

// "My Talking Macaw and a very long story…" → at most `max` characters, cut at a word.
export function snippet(text, max) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

// The site's own card image (app/opengraph-image.png), for pages without a photo. Setting a page's
// own openGraph replaces the site-wide one, so this has to be added back explicitly.
export const DEFAULT_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "ConnectSpace" };

// Cloudinary photos resized for preview cards; other images (local dev uploads) as they are.
export const previewImage = (src, width = 1200) => optimizedImage(src, width);
