// Where you land after deleting your account.
import Link from "next/link";

export const metadata = { title: "Account deleted" };

export default function GoodbyePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center font-sans">
      <h1 className="text-2xl font-bold">Your account has been deleted</h1>
      <p className="mt-3 opacity-80">
        Your profile, posts, photos, comments, likes and conversations are gone. Thanks for trying ConnectSpace.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-full border border-field px-5 py-2 font-medium hover:bg-subtle">
          Go home
        </Link>
        <Link href="/register" className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-hover">
          Create a new account
        </Link>
      </div>
    </main>
  );
}
