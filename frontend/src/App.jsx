import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import Unauthorized from "./pages/Unauthorized";
import CashierLayout from "./layouts/CashierLayout";
import OwnerLayout from "./layouts/OwnerLayout";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
    return (user.is_superuser || user.role === "OWNER")
      ? <Navigate to="/owner" replace />
      : <Navigate to="/cashier" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element={<HomeRedirect />} />

          <Route element={<RequireAuth allowRoles={["CASHIER", "OWNER"]} />}>
            <Route path="/cashier" element={<CashierLayout />} />
          </Route>

          <Route element={<RequireAuth allowRoles={["OWNER"]} />}>
            <Route path="/owner" element={<OwnerLayout />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}