// A labelled input with an error message underneath. Used by the login and register forms.
export default function FormField({ label, name, error, hint, ...inputProps }) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40 ${
          error ? "border-danger" : "border-line-strong"
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs opacity-60">{hint}</p>
      )}
    </div>
  );
}
