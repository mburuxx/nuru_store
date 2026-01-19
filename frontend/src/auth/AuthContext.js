import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthTokens, clearAuthTokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthed = !!localStorage.getItem("access");

  async function fetchProfile() {
    const res = await api.get("/api/users/profile/");
    setUser(res.data);
  }

  async function bootstrap() {
    if (!isAuthed) {
      setLoading(false);
      return;
    }
    try {
      await fetchProfile();
    } catch {
      clearAuthTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login({ username, password }) {
    // if your login endpoint returns refresh+access like RegisterView
    const res = await api.post("/api/users/login/", { username, password });
    setAuthTokens({ access: res.data.access, refresh: res.data.refresh });
    await fetchProfile();
  }

  function logout() {
    clearAuthTokens();
    setUser(null);
  }

  const value = { user, loading, login, logout, isAuthed: !!user };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}