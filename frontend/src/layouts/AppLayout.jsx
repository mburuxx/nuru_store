import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { notificationsApi } from "../api/notifications";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Brand token — single source of truth used across this file
const BRAND = "#1B2A4A";

function Bell({ unread }) {
  return (
    <div className="relative">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-stone-600">
        <path
          d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1l-2-2Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
        />
      </svg>
      {unread > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </div>
  );
}

/** Desktop tab — flex-1 equal width, underline indicator */
function TopTab({ to, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex-1 text-center py-3 text-sm font-semibold transition-colors duration-150 relative group select-none",
          isActive ? "text-[#1B2A4A]" : "text-stone-500 hover:text-stone-800"
        )
      }
    >
      {({ isActive }) => (
        <>
          {children}
          <span
            className={cn(
              "absolute bottom-0 left-4 right-4 h-[2.5px] rounded-full transition-all duration-200",
              isActive
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-40"
            )}
            style={{ background: isActive ? BRAND : "#a8a29e" }}
          />
        </>
      )}
    </NavLink>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-stone-400">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Bottom nav icons ──────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconPOS() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2 9h20" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2M15 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconInventory() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3 7l9 4m0 10V11m9-4l-9 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function IconStockOps() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconProducts() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M6 2h12l2 6H4L6 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconCategories() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 18h6M18 15v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconSales() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconCatalog() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.5 19.5L22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconScan() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const TAB_ICONS = {
  "Dashboard":  <IconDashboard />,
  "POS":        <IconPOS />,
  "Inventory":  <IconInventory />,
  "Stock Ops":  <IconStockOps />,
  "Products":   <IconProducts />,
  "Categories": <IconCategories />,
  "Sales":      <IconSales />,
  "My Sales":   <IconSales />,
  "Catalog":    <IconCatalog />,
  "Scan SKU":   <IconScan />,
};

/** Floating pill bottom nav — mobile only */
function BottomNav({ tabs }) {
  const location = useLocation();
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div
        className="flex items-end gap-1 border border-stone-200/80 shadow-2xl rounded-[28px] px-2 py-2"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        {tabs.map((t) => {
          const isActive = t.end
            ? location.pathname === t.to
            : location.pathname.startsWith(t.to);
          return (
            <NavLink key={t.to} to={t.to} end={t.end} className="flex flex-col items-center">
              <span
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl transition-all duration-200 px-3 pt-2 pb-1.5",
                  isActive
                    ? "text-white shadow-lg scale-110 -translate-y-1"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                )}
                style={{
                  minWidth: 52,
                  background: isActive ? BRAND : undefined,
                }}
              >
                {TAB_ICONS[t.label] ?? <IconDashboard />}
                <span className={cn(
                  "text-[10px] font-semibold leading-tight mt-0.5 whitespace-nowrap",
                  isActive ? "text-white" : "text-stone-500"
                )}>
                  {t.label}
                </span>
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
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
    } catch {}
  }, []);

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 25000);
    return () => clearInterval(t);
  }, [loadUnread]);

  const tabs = useMemo(() => {
    if (isOwner) {
      return [
        { to: "/app/owner",                    label: "Dashboard",  end: true },
        { to: "/app/owner/inventory",          label: "Inventory",  end: true },
        { to: "/app/owner/inventory/ops",      label: "Stock Ops" },
        { to: "/app/owner/catalog/products",   label: "Products" },
        { to: "/app/owner/catalog/categories", label: "Categories" },
        { to: "/app/sales",                    label: "Sales" },
      ];
    }
    return [
      { to: "/app/cashier",         label: "Dashboard", end: true },
      { to: "/app/cashier/pos",     label: "POS" },
      { to: "/app/cashier/catalog", label: "Catalog" },
      { to: "/app/cashier/scan",    label: "Scan SKU" },
      { to: "/app/sales",           label: "My Sales" },
    ];
  }, [isOwner]);

  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (!acctRef.current?.contains(e.target)) setAcctOpen(false);
    }
    function onEsc(e) { if (e.key === "Escape") setAcctOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    // BRAND: warm off-white page background — cards now visibly lift off the page
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#F7F6F3" }}>

      {/* ── Sticky header ── */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          background: "rgba(255,255,255,0.97)",
          borderColor: "#e7e5e0",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Brand + controls row */}
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3 flex items-center justify-between gap-3">

          {/* Brand mark */}
          <button
            type="button"
            onClick={() => nav(homePath)}
            className="flex items-center gap-3 group cursor-pointer flex-shrink-0"
          >
            {/* Logo: brand colour square with amber accent dot */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-sm relative flex-shrink-0"
              style={{ background: BRAND }}
            >
              N
              {/* Amber accent dot — NURU = light */}
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ background: "#F59E0B" }}
              />
            </div>
            <div className="leading-tight text-left">
              <div className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                Business Console
              </div>
              <div
                className="text-sm font-extrabold tracking-wide transition-colors"
                style={{ color: BRAND }}
              >
                NURU STORES
              </div>
            </div>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {isOwner ? (
            <button
              type="button"
              onClick={() => nav("/app/notifications")}
              className="rounded-xl border px-3 py-2 transition flex items-center gap-2 hover:bg-stone-50"
              style={{ borderColor: "#e7e5e0", background: "white" }}
            >
              <Bell unread={unread} />
              <span className="hidden sm:inline text-sm font-semibold text-stone-600">Alerts</span>
            </button>
            ) :null}

            {/* Account dropdown — desktop */}
            <div className="hidden md:flex items-center gap-2 pl-2 relative" ref={acctRef}>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setAcctOpen((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold transition hover:opacity-70"
                  style={{ color: BRAND }}
                  aria-haspopup="menu"
                  aria-expanded={acctOpen ? "true" : "false"}
                >
                  {user?.username}
                  <ChevronDown />
                </button>
                <div className="text-xs text-stone-400">
                  {location.pathname.startsWith("/app/owner") ? "Owner space" : "Cashier space"}
                </div>
              </div>
              {/* Role badge — amber for owner (brand accent), stone for cashier */}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                  isOwner
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-stone-100 text-stone-700 border-stone-200"
                )}
              >
                {roleLabel}
              </span>

              {acctOpen ? (
                <div
                  className="absolute right-0 top-[52px] w-56 rounded-2xl border bg-white p-2 z-50"
                  style={{
                    borderColor: "#e7e5e0",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.13), 0 1.5px 4px rgba(0,0,0,0.08)",
                    // Fully opaque — no bleed-through from header backdrop-filter
                    backgroundColor: "#ffffff",
                  }}
                  role="menu"
                >
                  {[
                    { label: "Profile", path: "/app/profile" },
                    { label: "Change password", path: "/app/change-password" },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => { setAcctOpen(false); nav(item.path); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100 transition"
                      role="menuitem"
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="my-2 border-t border-stone-100" />
                  <button
                    type="button"
                    onClick={() => { setAcctOpen(false); logout(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            {/* Mobile logout */}
            <div className="md:hidden">
              <Button variant="ghost" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>

        {/* ── Desktop tab bar — centered, evenly spaced ── */}
        <div className="hidden md:block border-t bg-white" style={{ borderColor: "#f0ede8" }}>
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <nav className="flex items-stretch">
              {tabs.map((t) => (
                <TopTab key={t.to} to={t.to} end={t.end}>{t.label}</TopTab>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6 pb-28 md:pb-8">
        <Outlet />
      </main>

      {/* ── Floating pill bottom nav — mobile only ── */}
      <BottomNav tabs={tabs} />
    </div>
  );
}