// Server-side wrapper for /p/:id. It only adds the link preview (title, description, photo);
// the page itself (page.js) still loads the post in the browser as before.
import { fetchPublic, snippet, previewImage, DEFAULT_IMAGE } from "@/lib/preview";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await fetchPublic(`/api/posts/${encodeURIComponent(id)}`);
  const post = data?.post;
  if (!post) return { title: "Post" }; // not found, private, or API asleep → generic card

  const title = `${post.author.name}: “${snippet(post.content, 60)}”`;
  const description = snippet(post.content, 200);
  const photo = post.images?.[0];

  return {
    title,
    description,
    openGraph: {
      type: "article",
      siteName: "ConnectSpace",
      title,
      description,
      publishedTime: post.createdAt,
      images: [photo ? { url: previewImage(photo), alt: `Photo by ${post.author.name}` } : DEFAULT_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [photo ? previewImage(photo) : DEFAULT_IMAGE.url],
    },
  };
}

export default function PostLayout({ children }) {
  return children;
}
