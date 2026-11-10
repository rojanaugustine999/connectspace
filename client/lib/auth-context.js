"use client";

// AuthProvider keeps the logged-in user in React state, shared by every page.
// Any component can call: const { user, loading, login, register, logout } = useAuth();
//
// The JWT itself lives in an httpOnly cookie that JavaScript can't read.
// So on page load we ask the API "who am I?" (GET /api/auth/me) to find out.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null)) // 401 = not logged in, that's fine
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const data = await api("/api/auth/register", { method: "POST", body: form });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // After editing the profile, pages call updateUser(newUser) so the nav bar etc. update too.
  const updateUser = useCallback((newUser) => setUser(newUser), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
