"use client";

// A small notice under the nav while the free-plan API server is waking up (see lib/api.js).
// role="status" makes screen readers announce it politely, without interrupting.
import { useEffect, useState } from "react";

export default function WakingBanner() {
  const [waking, setWaking] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const onChange = (e) => setWaking(e.detail.waking);
    window.addEventListener("api:waking", onChange);
    return () => window.removeEventListener("api:waking", onChange);
  }, []);

  // Count the seconds so a long wait feels like progress, not a freeze.
  useEffect(() => {
    if (!waking) return setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [waking]);

  if (!waking) return null;

  return (
    <div role="status" className="border-b border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5 text-sm">
        <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="min-w-0">
          <span className="font-medium">Waking up the server…</span>{" "}
          <span className="opacity-80">Free hosting sleeps when idle, so the first visit can take up to a minute.</span>
        </p>
        <span className="ml-auto shrink-0 tabular-nums opacity-70" aria-hidden>
          {seconds}s
        </span>
      </div>
    </div>
  );
}
