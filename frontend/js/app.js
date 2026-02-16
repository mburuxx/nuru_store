import { login, apiFetch, safeJson } from "./api/client.js";
import { getAccess, clearTokens } from "./state/auth.js";
import { setText, setJson } from "./ui/render.js";

function syncAuthUI() {
  setText("authStatus", getAccess() ? "Logged in ✅" : "Not logged in ❌");
}

document.getElementById("btnLogin").addEventListener("click", async () => {
  setJson("output", { loading: true, action: "login" });

  try {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    await login(username, password);
    syncAuthUI();
    setJson("output", { ok: true, message: "Logged in" });
  } catch (e) {
    setJson("output", { ok: false, error: String(e.message || e) });
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  clearTokens();
  syncAuthUI();
  setJson("output", { ok: true, message: "Logged out" });
});

document.getElementById("btnFetch").addEventListener("click", async () => {
  const endpoint = document.getElementById("endpoint").value.trim() || "/api/me/";
  setJson("output", { loading: true, endpoint });

  try {
    const res = await apiFetch(endpoint, { method: "GET" });
    const data = await safeJson(res);

    setJson("output", {
      ok: res.ok,
      status: res.status,
      endpoint,
      data,
    });
  } catch (e) {
    setJson("output", { ok: false, error: String(e.message || e) });
  }
});

syncAuthUI();