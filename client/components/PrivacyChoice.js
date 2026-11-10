// Public / Private radio cards, used when creating and editing a group.
const OPTIONS = [
  { value: false, title: "🌐 Public", text: "Anyone can see posts and join." },
  { value: true, title: "🔒 Private", text: "Only members see posts. Admins approve who joins." },
];

export default function PrivacyChoice({ value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Privacy</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <label
            key={String(o.value)}
            className={`cursor-pointer rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-500 ${
              value === o.value ? "border-blue-600 ring-2 ring-blue-500/30" : "border-black/15 dark:border-white/20"
            }`}
          >
            <input
              type="radio"
              name="privacy"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="block font-medium">{o.title}</span>
            <span className="block text-sm opacity-70">{o.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
