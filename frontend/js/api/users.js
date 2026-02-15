import { apiFetch } from "./client.js";
import { setTokens, clearTokens, getRefresh } from "../auth/tokens.js";

export async function register({ username, email, phone, password }) {
  const res = await apiFetch("/api/users/register/", {
    method: "POST",
    auth: false,
    body: { username, email, phone, password },
  });

  if (!res.ok) throw new Error(res.data?.detail || res.data?.message || "Registration failed");
  // your RegisterView returns access + refresh
  setTokens({ access: res.data.access, refresh: res.data.refresh });
  return res.data;
}

export async function login({ username, password }) {
  const res = await apiFetch("/api/users/login/", {
    method: "POST",
    auth: false,
    body: { username, password },
  });

  if (!res.ok) throw new Error(res.data?.detail || "Invalid credentials");
  // TokenObtainPairView returns access + refresh
  setTokens({ access: res.data.access, refresh: res.data.refresh });
  return res.data;
}

export async function getProfile() {
  // ProfileView returns role + is_superuser + etc
  const res = await apiFetch("/api/users/profile/");
  if (!res.ok) throw new Error("Failed to load profile");
  return res.data;
}

export async function logout() {
  const refresh = getRefresh();
  // best-effort logout; even if it fails, clear local tokens
  if (refresh) {
    await apiFetch("/api/users/logout/", { method: "POST", body: { refresh } }).catch(() => {});
  }
  clearTokens();
}