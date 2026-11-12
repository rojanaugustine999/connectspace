// Profile page, server part. For a guest, fetch the profile and first posts on the server (both at
// once), so they arrive inside the HTML. Logged-in visitors load them in the browser as before,
// because only then can the API say whether *you* follow this person.
import { fetchPublic, isGuest } from "@/lib/preview";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage({ params }) {
  const { username } = await params;
  if (!(await isGuest())) return <ProfileClient key={username} />;

  const name = encodeURIComponent(username);
  const [profile, posts] = await Promise.all([
    fetchPublic(`/api/users/${name}`, { revalidate: 15 }),
    fetchPublic(`/api/users/${name}/posts`, { revalidate: 15 }),
  ]);
  const initial = profile?.user && posts ? { profile: profile.user, posts } : null;
  return <ProfileClient key={username} initial={initial} />;
}
