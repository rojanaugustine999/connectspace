// Server-side wrapper for /u/:username (and its followers/following pages).
// It only adds the link preview and tab title; the page still loads in the browser as before.
import { fetchPublic, snippet, previewImage, DEFAULT_IMAGE } from "@/lib/preview";

export async function generateMetadata({ params }) {
  const { username } = await params;
  const data = await fetchPublic(`/api/users/${encodeURIComponent(username)}`);
  const user = data?.user;
  if (!user) return { title: "Profile" };

  const title = `${user.name} (@${user.username})`;
  const description = user.bio ? snippet(user.bio, 200) : `See ${user.name}'s posts on ConnectSpace.`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      siteName: "ConnectSpace",
      title,
      description,
      username: user.username,
      images: [user.avatarUrl ? { url: previewImage(user.avatarUrl, 400), width: 400, height: 400, alt: user.name } : DEFAULT_IMAGE],
    },
    // A profile photo is square, so the small card fits it better than the wide one.
    twitter: { card: "summary", title, description, images: [user.avatarUrl ? previewImage(user.avatarUrl, 400) : DEFAULT_IMAGE.url] },
  };
}

export default function ProfileLayout({ children }) {
  return children;
}
