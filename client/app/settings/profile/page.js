"use client";

// Edit profile: PATCH /api/users/me  (requireAuth + Zod validation on the server)
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { useRequireAuth } from "@/lib/useRequireAuth";
import Avatar from "@/components/Avatar";
import FormField from "@/components/FormField";
import DeleteAccount from "@/components/DeleteAccount";

const BIO_MAX = 160;

export default function EditProfilePage() {
  const { user, loading, updateUser } = useRequireAuth();
  const [form, setForm] = useState({ name: "", bio: "", avatarUrl: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Upload the photo first (→ url), then put the url in the form. "Save" stores it on the profile.
  async function pickPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setErrors((prev) => ({ ...prev, avatarUrl: undefined }));
    setMessage("");
    try {
      const url = await uploadImage(file, "avatars");
      setForm((prev) => ({ ...prev, avatarUrl: url }));
      setMessage("Photo uploaded. Press Save to keep it.");
    } catch (err) {
      setErrors((prev) => ({ ...prev, avatarUrl: err.message }));
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (user) setForm({ name: user.name, bio: user.bio ?? "", avatarUrl: user.avatarUrl ?? "" });
  }, [user]);

  if (loading || !user) return <p className="p-8 text-center opacity-60">Loading…</p>;

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage("");
    try {
      const data = await api("/api/users/me", { method: "PATCH", body: form });
      updateUser(data.user); // nav bar avatar etc. update straight away
      setMessage("Profile saved ✓");
    } catch (err) {
      setErrors(err.details);
      if (!Object.keys(err.details).length) setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  const preview = { ...user, name: form.name || user.name, avatarUrl: errors.avatarUrl ? null : form.avatarUrl || null };

  return (
    <main className="mx-auto max-w-lg px-4 py-8 font-sans">
      <Link href={`/u/${user.username}`} className="text-sm opacity-70 hover:underline">
        ← Back to profile
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit profile</h1>

      <div className="mt-6 flex items-center gap-4">
        <Avatar user={preview} size="lg" />
        <div className="min-w-0">
          <p className="font-semibold truncate">{preview.name}</p>
          <p className="text-sm opacity-60">@{user.username}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <FormField label="Name" name="name" value={form.name} onChange={update} error={errors.name} />

        <div>
          <div className="flex justify-between">
            <label htmlFor="bio" className="block text-sm font-medium mb-1">
              Bio
            </label>
            <span className={`text-xs ${form.bio.length > BIO_MAX ? "text-danger" : "opacity-60"}`}>
              {form.bio.length}/{BIO_MAX}
            </span>
          </div>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            value={form.bio}
            onChange={update}
            aria-invalid={Boolean(errors.bio)}
            className={`w-full rounded-lg border bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40 ${
              errors.bio ? "border-danger" : "border-line-strong"
            }`}
          />
          {errors.bio && <p className="mt-1 text-sm text-danger">{errors.bio}</p>}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Profile photo</p>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={pickPhoto} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              disabled={uploading}
              className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "📷 Upload photo"}
            </button>
            {form.avatarUrl && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, avatarUrl: "" }))}
                className="px-2 text-sm opacity-70 underline hover:opacity-100"
              >
                Remove photo
              </button>
            )}
          </div>
          {errors.avatarUrl && <p className="mt-1 text-sm text-danger">{errors.avatarUrl}</p>}
          <p className="mt-1 text-xs opacity-60">JPG, PNG, GIF or WebP, up to 5 MB.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-foreground text-background px-6 py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
        </div>
      </form>

      <DeleteAccount />
    </main>
  );
}
