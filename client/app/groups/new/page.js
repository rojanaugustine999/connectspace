"use client";

// Create a group: POST /api/groups → go to /groups/<slug>
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import FormField from "@/components/FormField";
import PrivacyChoice from "@/components/PrivacyChoice";

export default function NewGroupPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", isPrivate: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading || !user) return <p className="p-8 text-center opacity-60">Loading…</p>;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      const { group } = await api("/api/groups", { method: "POST", body: form });
      router.push(`/groups/${group.slug}`);
    } catch (err) {
      setErrors(err.details);
      if (!Object.keys(err.details).length) setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 font-sans">
      <Link href="/groups" className="text-sm opacity-70 hover:underline">
        ← Groups
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Create a group</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <FormField
          label="Name"
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          hint="3–50 characters"
        />
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description <span className="font-normal opacity-60">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            maxLength={300}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-line-strong bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/40"
          />
          {errors.description && <p className="mt-1 text-sm text-danger">{errors.description}</p>}
        </div>
        <PrivacyChoice value={form.isPrivate} onChange={(isPrivate) => setForm({ ...form, isPrivate })} />

        {formError && <p className="text-sm text-danger">{formError}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create group"}
        </button>
      </form>
    </main>
  );
}
