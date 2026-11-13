"use client";

// Credit line at the bottom of every page. Hidden on Messages, which fills the whole screen
// like a chat app (a footer there would push the message box off-screen).
import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/messages")) return null;

  return (
    <footer className="mt-12 border-t border-line">
      <p className="mx-auto max-w-3xl px-4 py-6 text-center text-sm opacity-70">
        Designed &amp; Developed by{" "}
        <a
          href="https://github.com/rojanaugustine999"
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:underline"
        >
          Rojan Augustine
        </a>
        .
      </p>
    </footer>
  );
}
