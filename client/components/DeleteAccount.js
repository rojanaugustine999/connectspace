"use client";

// "Delete account" at the bottom of Settings. Two deliberate steps, like GitHub or Google:
//   1. a plain button that only opens the form (so it can't be clicked by accident)
//   2. the form says exactly what will go, and asks for the password before anything is deleted
// DELETE /api/users/me { password } removes everything; then we leave with a full page load,
// so every part of the app forgets the account at once.
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import FormField from "@/components/FormField";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const openButtonRef = useRef(null);

  function cancel() {
    setOpen(false);
    setPassword("");
    setError("");
    requestAnimationFrame(() => openButtonRef.current?.focus());
  }

  async function handleDelete(e) {
    e.preventDefault();
    setDeleting(true);
    setError("");
    try {
      await api("/api/users/me", { method: "DELETE", body: { password } });
      window.location.replace("/goodbye");
    } catch (err) {
      setError(err.details?.password || err.message);
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="delete-account" className="mt-12 rounded-xl border border-danger/40 p-5">
      <h2 id="delete-account" className="text-lg font-bold text-danger">
        Delete account
      </h2>

      {!open ? (
        <>
          <p className="mt-1 text-sm opacity-80">Permanently remove your account and everything in it.</p>
          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-lg border border-danger/60 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Delete my account…
          </button>
        </>
      ) : (
        <form onSubmit={handleDelete} className="mt-2 space-y-4">
          <div className="text-sm">
            <p className="font-medium">This can&apos;t be undone. It will permanently delete:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 opacity-80">
              <li>your profile, photo, followers and the people you follow</li>
              <li>all your posts and photos, comments and likes</li>
              <li>your conversations, for both you and the people you talked to</li>
              <li>groups where you&apos;re the only member (other groups you own pass to an admin or member)</li>
            </ul>
          </div>
          <FormField
            label="Enter your password to confirm"
            name="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoFocus
            required
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!password || deleting}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button type="button" onClick={cancel} className="rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-subtle">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
