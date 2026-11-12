// Home page, server part. For a guest (no login cookie), fetch the first page of posts here, on the
// website's server, so they arrive inside the HTML instead of after the page has loaded.
// Logged-in visitors get their personal feed in the browser, exactly as before.
// If the API doesn't answer within 3 s, guestFirstPage is null and the browser loads the posts itself.
import { fetchPublic, isGuest } from "@/lib/preview";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  if (!(await isGuest())) return <HomeClient />;
  const guestFirstPage = await fetchPublic("/api/posts/explore", { revalidate: 15 });
  return <HomeClient isGuest guestFirstPage={guestFirstPage} />;
}
