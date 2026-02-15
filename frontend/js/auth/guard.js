import { getProfile, logout } from "../api/users.js";
import { clearTokens } from "./tokens.js";

export async function requireAuthAndRoute() {
  try {
    const profile = await getProfile();

    // Your backend sets OWNER for superuser via ensure_profile
    const role = profile.role;

    if (role === "OWNER") {
      window.location.href = "/pages/owner-dashboard.html";
      return;
    }

    window.location.href = "/pages/cashier-dashboard.html";
  } catch (e) {
    clearTokens();
    window.location.href = "/index.html";
  }
}

export async function requireRole(allowedRoles = []) {
  try {
    const profile = await getProfile();
    if (!allowedRoles.includes(profile.role)) {
      // logged in but wrong page
      window.location.href = profile.role === "OWNER"
        ? "/pages/owner-dashboard.html"
        : "/pages/cashier-dashboard.html";
      return null;
    }
    return profile;
  } catch {
    clearTokens();
    window.location.href = "/index.html";
    return null;
  }
}

export async function handleLogoutClick(btnSelector = "#logoutBtn") {
  const btn = document.querySelector(btnSelector);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await logout();
    window.location.href = "/index.html";
  });
}