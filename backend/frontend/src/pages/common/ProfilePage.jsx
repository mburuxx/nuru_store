import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Badge from "../../components/ui/Badge";

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      setOk("");
      try {
        const res = await api.get("/api/users/me/");
        setForm({ email: res.data?.email || "", phone: res.data?.phone || "" });
      } catch {
        setErr("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await api.patch("/api/users/me/", { email: form.email, phone: form.phone });
      setOk("Profile updated.");
    } catch (e2) {
      const data = e2?.response?.data;
      setErr(data?.email?.[0] || data?.detail || "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  const isOwner = user?.is_superuser || user?.role === "OWNER";

  return (
    <Card>
      <CardHeader
        title="Profile"
        subtitle="Update your contact details. Role is controlled by Owner/Superuser."
        right={<Badge tone={isOwner ? "blue" : "green"}>{user?.is_superuser ? "SUPERUSER" : user?.role}</Badge>}
      />
      <CardBody>
        {loading ? (
          <Loader />
        ) : (
          <form onSubmit={onSave} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Username" value={user?.username || ""} disabled />
              <Input label="Role" value={user?.is_superuser ? "SUPERUSER" : user?.role || ""} disabled />
            </div>

            <Input label="Email" value={form.email} onChange={(e)=>setForm(s=>({...s, email:e.target.value}))} placeholder="name@email.com" />
            <Input label="Phone" value={form.phone} onChange={(e)=>setForm(s=>({...s, phone:e.target.value}))} placeholder="+254..." />

            {err ? <div className="text-sm text-red-600">{err}</div> : null}
            {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setErr(""); setOk(""); }}>
                Clear alerts
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}