// A rounded-square icon with the group's first letter (avatars are circles, groups are squares).
const COLORS = ["bg-indigo-600", "bg-teal-600", "bg-orange-600", "bg-pink-600", "bg-lime-700", "bg-sky-600"];

export default function GroupIcon({ group, size = "md" }) {
  const hash = [...group.slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const sizeClass = size === "lg" ? "size-16 text-2xl sm:size-20 sm:text-3xl" : "size-12 text-lg";
  return (
    <div
      aria-hidden
      className={`${sizeClass} ${COLORS[hash % COLORS.length]} grid shrink-0 place-items-center rounded-xl font-bold text-white`}
    >
      {group.name.charAt(0).toUpperCase()}
    </div>
  );
}
