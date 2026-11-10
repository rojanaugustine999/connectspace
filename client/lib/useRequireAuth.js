"use client";

// For pages that need a logged-in user: redirects to /login if there isn't one.
// (Only for user experience. The API is what actually protects the data.)
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) router.replace("/login");
  }, [auth.loading, auth.user, router]);

  return auth;
}
