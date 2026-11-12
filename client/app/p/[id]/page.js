// Single post page, server part. For a guest, fetch the post on the server so it arrives inside the
// HTML (comments still load in the browser). Private group posts answer 404 to a guest, so they're
// never sent; the browser then shows "Post not found", as before.
import { fetchPublic, isGuest } from "@/lib/preview";
import PostClient from "./PostClient";

export default async function PostPage({ params }) {
  const { id } = await params;
  if (!(await isGuest())) return <PostClient key={id} />;
  const data = await fetchPublic(`/api/posts/${encodeURIComponent(id)}`, { revalidate: 15 });
  return <PostClient key={id} initialPost={data?.post ?? null} />;
}
