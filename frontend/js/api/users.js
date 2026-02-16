import { apiFetch, safeJson } from "./client.js";
import { setTokens } from "../state/auth.js";

export async function registerUser({ username, email, password, phone }){
  const res = await fetch("/api/users/register/", {
    method:"POST",
    headers: {"Content-Type":"application/json", "Accept":"application/json"},
    body: JSON.stringify({ username, email, password, phone })
  });

  const data = await safeJson(res);
  if (!res.ok) {
    // DRF returns field errors; keep it readable
    throw new Error(data?.detail || JSON.stringify(data));
  }

  // Your RegisterView returns tokens directly ✅
  if (data?.access && data?.refresh){
    setTokens({ access: data.access, refresh: data.refresh });
  }
  return data;
}

export async function getMe(){
  const res = await apiFetch("/api/users/me/", { method:"GET" });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || "Failed to load profile");
  return data;
}

export async function updateMe(payload){
  const res = await apiFetch("/api/users/me/", {
    method:"PATCH",
    body: JSON.stringify(payload),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
  return data;
}

export function roleToRoute(me){
  // superuser treated as owner-ish
  if (me?.is_superuser || me?.role === "OWNER") return "#/owner";
  return "#/cashier";
}