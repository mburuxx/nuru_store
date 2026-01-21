import React, { useState } from "react";
import { api } from "../../api/client";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ old_password: "", new_password: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await api.post("/api/users/change-password/", form);
      setOk("Password changed successfully.");
      setForm({ old_password: "", new_password: "" });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change Password" subtitle="Use a strong password." />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
          <Input label="Old password" type="password" value={form.old_password} onChange={(e)=>setForm(s=>({...s, old_password:e.target.value}))} />
          <Input label="New password" type="password" value={form.new_password} onChange={(e)=>setForm(s=>({...s, new_password:e.target.value}))} />

          {err ? <div className="text-sm text-red-600">{err}</div> : null}
          {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

          <Button type="submit" disabled={saving}>{saving ? "Updating..." : "Update password"}</Button>
        </form>
      </CardBody>
    </Card>
  );
}