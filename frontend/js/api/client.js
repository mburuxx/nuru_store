import { getAccess, getRefresh, setTokens, clearTokens } from "../auth/tokens.js";

const API_BASE = ""; // same-origin -> "/api/..." works behind nginx

function jsonHeaders(extra = {}) {
  return { "Content-Type": "application/json", ...extra };
}

async function parseJson(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  return { ok: res.ok, status: res.status, data };
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = auth && getAccess()
    ? jsonHeaders({ Authorization: `Bearer ${getAccess()}` })
    : jsonHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If access expired: try refresh once
  if (auth && res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const res2 = await fetch(`${API_BASE}${path}`, {
        method,
        headers: jsonHeaders({ Authorization: `Bearer ${getAccess()}` }),
        body: body ? JSON.stringify(body) : undefined,
      });
      return parseJson(res2);
    }
  }

  return parseJson(res);
}

async function tryRefresh() {
  const refresh = getRefresh();
  if (!refresh) return false;

  const res = await fetch(`${API_BASE}/api/users/refresh/`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ refresh }),
  });

  const { ok, data } = await parseJson(res);
  if (!ok || !data?.access) {
    clearTokens();
    return false;
  }

  setTokens({ access: data.access, refresh }); // refresh stays same unless you rotate client-side
  return true;
}