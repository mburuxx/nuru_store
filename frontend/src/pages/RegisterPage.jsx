import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setAuthTokens } from "../api/client";

export default function RegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "" });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/api/users/register/", form);
      setAuthTokens({ access: res.data.access, refresh: res.data.refresh });
      nav("/", { replace: true });
    } catch (e2) {
      setErr("Register failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>

        <div className="mt-6 space-y-3">
          <input className="w-full rounded-xl border p-3" placeholder="Username"
            value={form.username} onChange={(e)=>setForm(s=>({...s, username:e.target.value}))} />
          <input className="w-full rounded-xl border p-3" placeholder="Email (optional)"
            value={form.email} onChange={(e)=>setForm(s=>({...s, email:e.target.value}))} />
          <input className="w-full rounded-xl border p-3" placeholder="Phone (optional)"
            value={form.phone} onChange={(e)=>setForm(s=>({...s, phone:e.target.value}))} />
          <input type="password" className="w-full rounded-xl border p-3" placeholder="Password"
            value={form.password} onChange={(e)=>setForm(s=>({...s, password:e.target.value}))} />

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <button className="w-full rounded-xl bg-black text-white py-3 font-medium">
            Register
          </button>

          <div className="text-sm text-gray-600">
            Already have an account? <Link className="underline" to="/login">Login</Link>
          </div>
        </div>
      </form>
    </div>
  );
}