import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalog";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    selling_price: "",
    cost_price: "",
    category_id: "",
    is_active: true,
  });

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [catsRes, productRes] = await Promise.all([
          catalogApi.listCategories({ ordering: "name", is_active: "1" }),
          isEdit ? catalogApi.getProduct(id) : Promise.resolve(null),
        ]);

        const categories = catsRes.data?.results || catsRes.data || [];
        setCats(categories);

        if (isEdit && productRes) {
          const p = productRes.data;
          setForm({
            name: p.name || "",
            sku: p.sku || "",
            selling_price: p.selling_price || "",
            cost_price: p.cost_price || "",
            category_id: p.category?.id ?? "",
            is_active: !!p.is_active,
          });
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
        sku: form.sku,
        selling_price: form.selling_price,
        cost_price: form.cost_price === "" ? null : form.cost_price,
        category_id: form.category_id === "" ? null : Number(form.category_id),
        is_active: form.is_active,
      };

      if (isEdit) await catalogApi.updateProduct(id, payload);
      else await catalogApi.createProduct(payload);

      nav("/app/owner/catalog/products", { replace: true });
    } catch (e2) {
      const data = e2?.response?.data;
      setErr(data?.sku?.[0] || data?.name?.[0] || data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={isEdit ? "Edit Product" : "New Product"} subtitle="SKU must be unique." />
      <CardBody>
        {loading ? <Loader /> : (
          <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={form.name} onChange={(e)=>setForm(s=>({...s, name:e.target.value}))} />
              <Input label="SKU" value={form.sku} onChange={(e)=>setForm(s=>({...s, sku:e.target.value}))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Selling price" value={form.selling_price} onChange={(e)=>setForm(s=>({...s, selling_price:e.target.value}))} />
              <Input label="Cost price" value={form.cost_price ?? ""} onChange={(e)=>setForm(s=>({...s, cost_price:e.target.value}))} />
              <Select label="Category" value={form.category_id} onChange={(e)=>setForm(s=>({...s, category_id:e.target.value}))}>
                <option value="">— None —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e)=>setForm(s=>({...s, is_active:e.target.checked}))}
              />
              Active
            </label>

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