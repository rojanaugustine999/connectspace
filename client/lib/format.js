// "5m ago", "3h ago", "2d ago", then a date.
export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatJoined(date) {
  return new Date(date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
