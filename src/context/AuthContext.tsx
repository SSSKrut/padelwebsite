import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
  UNVERIFIED_USER = "UNVERIFIED_USER",
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  role: UserRole;
  elo: number;
  isPremium: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<User | null> {
  const res = await fetch("/.netlify/functions/auth-me", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch("/.netlify/functions/auth-refresh", {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let me = await fetchMe();
      if (!me) {
        const refreshed = await tryRefresh();
        if (refreshed) me = await fetchMe();
      }
      setUser(me);
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/.netlify/functions/auth-login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed.");
    setUser(data.user);
  }, []);

  const register = useCallback(async (formData: RegisterData) => {
    const res = await fetch("/.netlify/functions/auth-register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Registration failed.");
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/.netlify/functions/auth-logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
