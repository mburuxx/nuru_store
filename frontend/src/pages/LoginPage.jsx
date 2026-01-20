import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(form);
      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6">

        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-gray-500 mt-1">Cashier / Owner</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring"
              value={form.username}
              onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              autoComplete="current-password"
            />
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <button className="w-full rounded-xl bg-black text-white py-3 font-medium">
            Login
          </button>
          <div className="text-sm text-gray-600 mt-3">
            No account? <a className="underline" href="/register">Register</a>
          </div>
        </div>
      </form>
    </div>
  );
}