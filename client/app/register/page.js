"use client";

// Flow: form submit → useAuth().register → POST /api/auth/register
//       → 201: cookie set + user saved in context → go to /me
//       → 400/409: show the server's per-field messages under each input
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AuthCard from "@/components/AuthCard";
import FormField from "@/components/FormField";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined }); // clear that field's error while typing
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setErrors({});
    try {
      await register(form);
      router.push("/me");
    } catch (err) {
      setErrors(err.details);
      if (!Object.keys(err.details).length) setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join ConnectSpace in a few seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Name" name="name" autoComplete="name" value={form.name} onChange={update} error={errors.name} />
        <FormField
          label="Username"
          name="username"
          autoComplete="username"
          value={form.username}
          onChange={update}
          error={errors.username}
          hint="3–20 characters: letters, numbers or _"
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update}
          error={errors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update}
          error={errors.password}
          hint="At least 8 characters"
        />
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-foreground text-background py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
