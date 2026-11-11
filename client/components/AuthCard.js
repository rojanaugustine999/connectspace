// Shared layout for the login and register pages.
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        {/* The full logo is already in the nav bar, so the icon alone works as a friendly anchor here. */}
        <Link href="/" aria-label="ConnectSpace home" className="inline-block rounded-xl">
          <LogoMark size={44} />
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <p className="mt-6 text-sm text-center opacity-80">{footer}</p>}
      </div>
    </main>
  );
}
