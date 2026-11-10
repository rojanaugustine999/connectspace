"use client";

// Group settings (admins): edit name / description / privacy. Owner: delete the group.
//   PATCH /api/groups/:slug      DELETE /api/groups/:slug
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useGroup } from "@/lib/group-context";
import FormField from "@/components/FormField";
import PrivacyChoice from "@/components/PrivacyChoice";

export default function GroupSettingsPage() {
  const { group, reload, isAdmin } = useGroup();
  const router = useRouter();
  const [form, setForm] = useState({ name: group.name, description: group.description ?? "", isPrivate: group.isPrivate });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return <p className="py-8 text-center opacity-60">Only group admins can change settings.</p>;

  async function save(e) {
    e.preventDefault();
    if (group.isPrivate && !form.isPrivate && !window.confirm("Make the group public? Everyone will see its posts, and waiting requests will be approved.")) return;
    setSaving(true);
    setErrors({});
    setMessage("");
    try {
      await api(`/api/groups/${group.slug}`, { method: "PATCH", body: form });
      await reload();
      setMessage("Saved ✓");
    } catch (err) {
      setErrors(err.details);
      setMessage(Object.keys(err.details).length ? "" : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup() {
    const typed = window.prompt(`This deletes the group and ALL its posts for everyone. Type the group name to confirm:\n\n${group.name}`);
    if (typed === null) return;
    if (typed.trim() !== group.name) return alert("The name didn't match, so nothing was deleted.");
    try {
      await api(`/api/groups/${group.slug}`, { method: "DELETE" });
      router.push("/groups");
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={save} noValidate className="space-y-5">
        <FormField
          label="Name"
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          hint="The web address (/groups/…) stays the same."
        />
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            maxLength={300}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <PrivacyChoice value={form.isPrivate} onChange={(isPrivate) => setForm({ ...form, isPrivate })} />
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="rounded-lg bg-foreground px-6 py-2.5 font-medium text-background hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          {message && <p role="status" className="text-sm">{message}</p>}
        </div>
      </form>

      {group.myRole === "OWNER" && (
        <section className="mt-10 rounded-xl border border-red-500/40 p-4">
          <h2 className="font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
          <p className="mt-1 text-sm opacity-80">Deleting the group removes all of its posts, likes and comments. This can&apos;t be undone.</p>
          <button onClick={deleteGroup} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Delete group
          </button>
        </section>
      )}
    </div>
  );
}
