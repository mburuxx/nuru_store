import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalog";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function CategoryFormPage() {
  const { id } = useParams(); 
  const isEdit = !!id;
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [parents, setParents] = useState([]);
  const [form, setForm] = useState({ name: "", parent: "" });

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [catsRes, currentRes] = await Promise.all([
          catalogApi.listCategories({ ordering: "name" }),
          isEdit ? catalogApi.getCategory(id) : Promise.resolve(null),
        ]);

        const cats = catsRes.data?.results || catsRes.data || [];
        setParents(cats);

        if (isEdit && currentRes) {
          const c = currentRes.data;
          setForm({ name: c.name || "", parent: c.parent ?? "" });
        }
      } catch {
        setErr("Failed to load form.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        parent: form.parent === "" ? null : Number(form.parent),
      };

      if (isEdit) await catalogApi.updateCategory(id, payload);
      else await catalogApi.createCategory(payload);

      nav("/app/owner/catalog/categories", { replace: true });
    } catch (e2) {
      const data = e2?.response?.data;
      setErr(data?.name?.[0] || data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={isEdit ? "Edit Category" : "New Category"} subtitle="Keep category names clean and unique." />
      <CardBody>
        {loading ? <Loader /> : (
          <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Electronics"
            />

            <Select
              label="Parent (optional)"
              value={form.parent}
              onChange={(e) => setForm((s) => ({ ...s, parent: e.target.value }))}
            >
              <option value="">— None —</option>
              {parents
                .filter((p) => !isEdit || String(p.id) !== String(id))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </Select>

            {err ? <div className="text-sm text-red-600">{err}</div> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="secondary" onClick={() => nav(-1)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}