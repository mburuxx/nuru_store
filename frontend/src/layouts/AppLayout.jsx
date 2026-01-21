import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const isOwner = user?.is_superuser || user?.role === "OWNER";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Nuru Store</div>
                <div className="font-semibold text-gray-900">{user?.username}</div>
              </div>
              <Badge tone={isOwner ? "blue" : "green"}>
                {user?.is_superuser ? "SUPER" : user?.role}
              </Badge>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 space-y-1">
              <NavItem to={isOwner ? "/app/owner" : "/app/cashier"}>Dashboard</NavItem>
              <NavItem to="/app/profile">Profile</NavItem>
              <NavItem to="/app/change-password">Change Password</NavItem>

              {isOwner ? (
                <>
                  <div className="mt-3 text-xs font-semibold text-gray-400 px-2">CATALOG</div>
                  <NavItem to="/app/owner/catalog/categories">Categories</NavItem>
                  <NavItem to="/app/owner/catalog/products">Products</NavItem>

                  <div className="mt-3 text-xs font-semibold text-gray-400 px-2">INVENTORY</div>
                  <NavItem to="/app/owner/inventory">Inventory</NavItem>
                  <NavItem to="/app/owner/inventory/ops">Stock Ops</NavItem>
                  <NavItem to="/app/owner/inventory/movements">Movements</NavItem>

                  <div className="mt-3 text-xs font-semibold text-gray-400 px-2">SALES</div>
                  <NavItem to="/app/sales">Sales</NavItem>
                </>
              ) : (
                <>
                  <div className="mt-3 text-xs font-semibold text-gray-400 px-2">TOOLS</div>
                  <NavItem to="/app/cashier/pos">POS</NavItem>
                  <NavItem to="/app/cashier/catalog">Catalog</NavItem>
                  <NavItem to="/app/cashier/scan">Scan SKU</NavItem>

                  <div className="mt-3 text-xs font-semibold text-gray-400 px-2">SALES</div>
                  <NavItem to="/app/sales">My Sales</NavItem>
                </>
              )}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 flex gap-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => nav(isOwner ? "/app/owner" : "/app/cashier")}
              >
                Home
              </Button>
              <Button variant="ghost" className="w-full" onClick={logout}>
                Logout
              </Button>
            </div>
          </aside>

          <main className="space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}