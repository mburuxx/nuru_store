import { getAccess, getRefresh, setTokens, clearTokens } from "../state/auth.js";

const LOGIN_URL   = "/api/users/login/";
const REFRESH_URL = "/api/users/refresh/";

let refreshing = null;

export async function safeJson(res){
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; }
  catch { return { raw: text }; }
}

async function refreshAccess(){
  const refresh = getRefresh();
  if (!refresh) throw new Error("No refresh token");

  const res = await fetch(REFRESH_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json", "Accept":"application/json"},
    body: JSON.stringify({ refresh })
  });

  const data = await safeJson(res);

  if (!res.ok || !data?.access){
    clearTokens();
    throw new Error(data?.detail || "Refresh failed");
  }

  setTokens({ access: data.access });
  return data.access;
}

async function ensureRefresh(){
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try { return await refreshAccess(); }
    finally { refreshing = null; }
  })();
  return refreshing;
}

export async function apiFetch(url, options = {}){
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const access = getAccess();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const hasBody = options.body !== undefined && options.body !== null;
  const isForm  = hasBody && (options.body instanceof FormData);

  if (hasBody && !isForm && !headers.has("Content-Type")){
    headers.set("Content-Type","application/json");
  }

  const first = await fetch(url, { ...options, headers });

  if (first.status === 401 && getRefresh()){
    const newAccess = await ensureRefresh();
    const retryHeaders = new Headers(headers);
    retryHeaders.set("Authorization", `Bearer ${newAccess}`);
    return fetch(url, { ...options, headers: retryHeaders });
  }

  return first;
}

export async function login(username, password){
  const res = await fetch(LOGIN_URL, {
    method:"POST",
    headers: {"Content-Type":"application/json", "Accept":"application/json"},
    body: JSON.stringify({ username, password })
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || "Invalid username or password");

  if (!data?.access || !data?.refresh) throw new Error("Missing tokens from login");
  setTokens({ access: data.access, refresh: data.refresh });
  return data;
}

export async function logout(){
  // optional: call backend blacklist endpoint
  const refresh = getRefresh();
  try{
    if (refresh){
      await apiFetch("/api/users/logout/", {
        method:"POST",
        body: JSON.stringify({ refresh })
      });
    }
  } finally {
    clearTokens();
  }
}