// The ConnectSpace logo: two interlocking rings ("two people, one shared space").
// <LogoMark /> is the icon on its own; <Logo /> is icon + wordmark.
// The same drawing is in app/icon.svg (browser tab icon) and docs/brand/ (README).

export function LogoMark({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="8" fill="#155DFC" />
      <circle cx="12.5" cy="16" r="6.5" fill="none" stroke="#FFFFFF" strokeWidth="2.6" />
      <circle cx="19.5" cy="16" r="6.5" fill="none" stroke="#BEDBFF" strokeWidth="2.6" />
      {/* The left ring passes over the right one at the top, so they interlock like chain links. */}
      <path d="M14.18 9.72 A6.5 6.5 0 0 1 17.48 11.82" fill="none" stroke="#FFFFFF" strokeWidth="2.6" />
    </svg>
  );
}

// wordmark="responsive" hides the text on small screens (the icon stays), e.g. in the crowded mobile nav.
export default function Logo({ size = 28, wordmark = "always", className = "" }) {
  const textClass = wordmark === "responsive" ? "hidden sm:inline" : "inline";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className={`${textClass} text-lg font-bold tracking-tight`}>
        Connect<span className="text-link">Space</span>
      </span>
    </span>
  );
}
