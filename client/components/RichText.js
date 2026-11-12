// Post and comment text with "@username" turned into profile links.
// Same rule as the server (server/src/services/mention.service.js): 3–20 letters, numbers or _,
// and the @ must not follow a letter or number, so "me@example.com" stays plain text.
import Link from "next/link";

const MENTION = /(?<![a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,20})(?![a-zA-Z0-9_])/g;

export default function RichText({ text, className = "" }) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link key={m.index} href={`/u/${m[1].toLowerCase()}`} className="font-medium text-link hover:underline">
        @{m[1]}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <p className={`whitespace-pre-line break-words ${className}`}>{parts}</p>;
}
