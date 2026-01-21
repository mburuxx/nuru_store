import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

import AppLayout from "./layouts/AppLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import Unauthorized from "./pages/common/Unauthorized";
import ProfilePage from "./pages/common/ProfilePage";
import ChangePasswordPage from "./pages/common/ChangePasswordPage";

import OwnerDashboard from "./pages/owner/OwnerDashboard";
import CategoriesPage from "./pages/owner/CategoriesPage";
import CategoryFormPage from "./pages/owner/CategoryFormPage";
import ProductsPage from "./pages/owner/ProductsPage";
import ProductFormPage from "./pages/owner/ProductFormPage";

import CashierDashboard from "./pages/cashier/CashierDashboard";
import CashierCatalogPage from "./pages/cashier/CashierCatalogPage";
import ScanSkuPage from "./pages/cashier/ScanSkuPage";

function AppEntry() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isOwner = user.is_superuser || user.role === "OWNER";
  return <Navigate to={isOwner ? "/app/owner" : "/app/cashier"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* entry */}
          <Route path="/" element={<AppEntry />} />
          <Route path="/app" element={<AppEntry />} />

          {/* protected app */}
          <Route element={<RequireAuth allowRoles={["CASHIER", "OWNER"]} />}>
            <Route path="/app" element={<AppLayout />}>
              {/* shared */}
              <Route path="profile" element={<ProfilePage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />

              {/* cashier */}
              <Route path="cashier" element={<CashierDashboard />} />
              <Route path="cashier/catalog" element={<CashierCatalogPage />} />
              <Route path="cashier/scan" element={<ScanSkuPage />} />

              {/* owner only */}
              <Route element={<RequireAuth allowRoles={["OWNER"]} />}>
                <Route path="owner" element={<OwnerDashboard />} />
                <Route path="owner/catalog/categories" element={<CategoriesPage />} />
                <Route path="owner/catalog/categories/new" element={<CategoryFormPage />} />
                <Route path="owner/catalog/categories/:id/edit" element={<CategoryFormPage />} />
                <Route path="owner/catalog/products" element={<ProductsPage />} />
                <Route path="owner/catalog/products/new" element={<ProductFormPage />} />
                <Route path="owner/catalog/products/:id/edit" element={<ProductFormPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}