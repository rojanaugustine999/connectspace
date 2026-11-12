// "People" is now the People tab of the Search page. This keeps old links and bookmarks working.
import { redirect } from "next/navigation";

export default function PeoplePage() {
  redirect("/search");
}
