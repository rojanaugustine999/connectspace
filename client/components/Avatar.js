// Shows the user's photo, or their first initial on a colour picked from their username.
const COLORS = ["bg-brand", "bg-emerald-600", "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-cyan-600"];

const SIZES = {
  sm: "size-9 text-sm",
  md: "size-12 text-lg",
  lg: "size-20 text-3xl sm:size-24",
};

export default function Avatar({ user, size = "md" }) {
  const sizeClass = SIZES[size];

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt="" className={`${sizeClass} shrink-0 rounded-full object-cover bg-subtle-strong`} />
    );
  }

  const hash = [...user.username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <div
      aria-hidden
      className={`${sizeClass} ${COLORS[hash % COLORS.length]} shrink-0 rounded-full text-white grid place-items-center font-bold`}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}
