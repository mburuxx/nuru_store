// src/layouts/AppLayout.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { notificationsApi } from "../api/notifications";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Bell({ unread }) {
  return (
    <div className="relative">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-700">
        <path
          d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1l-2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-700 text-white text-[11px] flex items-center justify-center shadow">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </div>
  );
}

function TopTab({ to, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "px-3 py-2 rounded-xl text-sm font-semibold transition",
          isActive
            ? "bg-blue-950 text-white shadow"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        )
      }
    >
      {children}
    </NavLink>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-slate-500">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const isOwner = user?.is_superuser || user?.role === "OWNER";
  const homePath = isOwner ? "/app/owner" : "/app/cashier";
  const roleLabel = user?.is_superuser ? "SUPER" : user?.role || "—";

  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnread(res.data?.unread_count ?? 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 25000);
    return () => clearInterval(t);
  }, [loadUnread]);

  // Role-based nav items (horizontal)
  const tabs = useMemo(() => {
    if (isOwner) {
      return [
        { to: "/app/owner", label: "Dashboard", end: true },
        { to: "/app/owner/inventory", label: "Inventory" },
        { to: "/app/owner/inventory/ops", label: "Stock Ops" },
        { to: "/app/owner/catalog/products", label: "Products" },
        { to: "/app/owner/catalog/categories", label: "Categories" },
        { to: "/app/sales", label: "Sales" },
      ];
    }
    return [
      { to: "/app/cashier", label: "Dashboard", end: true },
      { to: "/app/cashier/pos", label: "POS" },
      { to: "/app/cashier/catalog", label: "Catalog" },
      { to: "/app/cashier/scan", label: "Scan SKU" },
      { to: "/app/sales", label: "My Sales" },
    ];
  }, [isOwner]);

  // Account dropdown
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (!acctRef.current) return;
      if (!acctRef.current.contains(e.target)) setAcctOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setAcctOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const usernameButton = (
    <button
      type="button"
      onClick={() => setAcctOpen((s) => !s)}
      className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 hover:text-blue-800 transition underline-offset-4 hover:underline"
      title="Account"
      aria-haspopup="menu"
      aria-expanded={acctOpen ? "true" : "false"}
    >
      {user?.username}
      <ChevronDown />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top business bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-4 flex items-center justify-between gap-3">
          {/* Brand — CLICKABLE */}
          <button
            type="button"
            onClick={() => nav(homePath)}
            className="flex items-center gap-3 group cursor-pointer"
            title="Go to dashboard"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-extrabold shadow-sm">
              N
            </div>
            <div className="leading-tight text-left">
              <div className="text-[11px] text-slate-500">Business Console</div>
              <div className="text-base font-extrabold tracking-wide text-slate-900 group-hover:text-blue-800 transition">
                NURU STORES
              </div>
            </div>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              type="button"
              onClick={() => nav("/app/notifications")}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 transition flex items-center gap-2"
              title="Notifications"
            >
              <Bell unread={unread} />
              <span className="hidden sm:inline text-sm font-semibold text-slate-700">Alerts</span>
            </button>

            {/* Account: username dropdown */}
            <div className="hidden md:flex items-center gap-2 pl-2 relative" ref={acctRef}>
              <div className="text-right">
                {usernameButton}
                <div className="text-xs text-slate-500">
                  {location.pathname.startsWith("/app/owner") ? "Owner space" : "Cashier space"}
                </div>
              </div>
              <Badge tone={isOwner ? "blue" : "green"}>{roleLabel}</Badge>

              {acctOpen ? (
                <div
                  className="absolute right-0 top-[52px] w-56 rounded-2xl border border-slate-200 bg-white shadow-lg p-2"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAcctOpen(false);
                      nav("/app/profile");
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                    role="menuitem"
                  >
                    Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAcctOpen(false);
                      nav("/app/change-password");
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                    role="menuitem"
                  >
                    Change password
                  </button>

                  <div className="my-2 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setAcctOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 transition"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            {/* Mobile: keep a simple logout button */}
            <div className="md:hidden">
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Horizontal nav */}
        <div className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <TopTab key={t.to} to={t.to} end={t.end}>
                  {t.label}
                </TopTab>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Page */}
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}