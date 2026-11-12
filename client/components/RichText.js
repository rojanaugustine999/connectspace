// Post and comment text with "@username" turned into profile links, and (on the search page)
// the searched words highlighted.
// Mentions use the same rule as the server (server/src/services/mention.service.js): 3–20 letters,
// numbers or _, and the @ must not follow a letter or number, so "me@example.com" stays plain text.
import Link from "next/link";

const MENTION = /(?<![a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,20})(?![a-zA-Z0-9_])/g;

// "walking dogs" → /\b(walk|dog)\w*/gi, so "walks" and "dog's" light up too. MongoDB search
// matches word stems the same way, so the highlight shows why a post was found.
export function highlightPattern(query) {
  const stems = String(query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !w.startsWith("-")) // "-word" means "without word" in MongoDB search
    .map((w) => w.replace(/[^\p{L}\p{N}_]/gu, ""))
    .map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w))
    .filter((w) => w.length >= 2);
  if (stems.length === 0) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...new Set(stems)].join("|")})[\\p{L}\\p{N}_]*`, "giu");
}

function withHighlights(text, pattern, keyPrefix) {
  if (!pattern) return [text];
  const out = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <mark key={`${keyPrefix}-${m.index}`} className="rounded bg-warning/25 px-0.5 text-inherit">
        {m[0]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RichText({ text, className = "", highlight }) {
  const pattern = highlightPattern(highlight);
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    if (m.index > last) parts.push(...withHighlights(text.slice(last, m.index), pattern, last));
    parts.push(
      <Link key={m.index} href={`/u/${m[1].toLowerCase()}`} className="font-medium text-link hover:underline">
        @{m[1]}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(...withHighlights(text.slice(last), pattern, last));

  return <p className={`whitespace-pre-line break-words ${className}`}>{parts}</p>;
}
