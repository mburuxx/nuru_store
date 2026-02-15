import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function RegisterPage() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(form);
      nav("/app", { replace: true });
    } catch (e2) {
      const data = e2?.response?.data;
      setErr(data?.detail || "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader title="Create account" subtitle="New users are CASHIER by default." />
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input label="Username" value={form.username} onChange={(e)=>setForm(s=>({...s, username:e.target.value}))} />
              <Input label="Email (optional)" value={form.email} onChange={(e)=>setForm(s=>({...s, email:e.target.value}))} />
              <Input label="Phone (optional)" value={form.phone} onChange={(e)=>setForm(s=>({...s, phone:e.target.value}))} />
              <Input label="Password" type="password" value={form.password} onChange={(e)=>setForm(s=>({...s, password:e.target.value}))} />

              {err ? <div className="text-sm text-red-600">{err}</div> : null}

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Register"}
              </Button>

              <div className="text-sm text-gray-600">
                Already have an account? <Link className="underline" to="/login">Login</Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}