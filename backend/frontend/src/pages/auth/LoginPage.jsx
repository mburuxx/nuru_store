import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(form);
      nav("/app", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader title="Sign in" subtitle="Cashier / Owner" />
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label="Username"
                value={form.username}
                onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                autoComplete="username"
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                autoComplete="current-password"
              />

              {err ? <div className="text-sm text-red-600">{err}</div> : null}

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>

              <div className="text-sm text-gray-600">
                No account? <Link className="underline" to="/register">Register</Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}