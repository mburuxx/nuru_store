import React, { useEffect, useState } from "react";
import { catalogApi } from "../../api/catalog";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

export default function CashierCatalogPage() {
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

  return (
    <Card>
      <CardHeader title="Catalog" subtitle="Cashier view (active products only)." />
      <CardBody>
        <div className="max-w-md">
          <Input label="Search by name or SKU" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="e.g. milk or 12345" />
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No products found" subtitle="Try a different search." />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b">
                  <th className="py-3">Name</th>
                  <th className="py-3">SKU</th>
                  <th className="py-3">Price</th>
                  <th className="py-3">Qty</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 text-gray-600">{p.sku}</td>
                    <td className="py-3">{p.selling_price}</td>
                    <td className="py-3">{p.quantity ?? 0}</td>
                    <td className="py-3">
                      <Badge tone={p.is_active ? "green" : "red"}>{p.is_active ? "Active" : "Inactive"}</Badge>
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