import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi } from "../../api/catalog";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

export default function ProductsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await catalogApi.listProducts({ search: q || undefined, ordering: "name" });
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function toggleActive(p) {
    try {
      if (p.is_active) await catalogApi.deactivateProduct(p.id);
      else await catalogApi.activateProduct(p.id);
      load();
    } catch {
      setErr("Failed to update product status.");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Products"
        subtitle="Manage products. Cost price only visible to Owner/Superuser."
        right={<Button onClick={() => nav("/app/owner/catalog/products/new")}>New product</Button>}
      />
      <CardBody>
        <div className="max-w-md">
          <Input label="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. milk or 12345" />
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No products yet"
              subtitle="Create products so the cashier can scan and sell."
              action={<Button onClick={() => nav("/app/owner/catalog/products/new")}>Create product</Button>}
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b">
                  <th className="py-3">Name</th>
                  <th className="py-3">SKU</th>
                  <th className="py-3">Price</th>
                  <th className="py-3">Cost</th>
                  <th className="py-3">Qty</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 text-gray-600">{p.sku}</td>
                    <td className="py-3">{p.selling_price}</td>
                    <td className="py-3">{p.cost_price ?? "—"}</td>
                    <td className="py-3">{p.quantity ?? 0}</td>
                    <td className="py-3">
                      <Badge tone={p.is_active ? "green" : "red"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <Button variant="ghost" onClick={() => nav(`/app/owner/catalog/products/${p.id}/edit`)}>
                        Edit
                      </Button>
                      <Button
                        variant={p.is_active ? "secondary" : "primary"}
                        onClick={() => toggleActive(p)}
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}