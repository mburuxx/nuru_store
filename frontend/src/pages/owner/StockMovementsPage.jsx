import React, { useEffect, useState, useCallback } from "react";
import { inventoryApi } from "../../api/inventory";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

export default function StockMovementsPage() {
  const [sku, setSku] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await inventoryApi.listMovements({ sku: sku || undefined });
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load movements.");
    } finally {
      setLoading(false);
    }
  }, [sku]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader title="Stock movements" subtitle="Audit trail of stock changes (sale, supply, adjustment, return, void)." />
      <CardBody>
        <div className="max-w-md">
          <Input label="Filter by SKU" value={sku} onChange={(e)=>setSku(e.target.value)} placeholder="e.g. 12345" />
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}
        {loading ? <div className="mt-4"><Loader /></div> : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b">
                  <th className="py-3">When</th>
                  <th className="py-3">SKU</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Dir</th>
                  <th className="py-3">Qty</th>
                  <th className="py-3">By</th>
                  <th className="py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-600">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="py-3">{m.product?.sku}</td>
                    <td className="py-3"><Badge tone="blue">{m.movement_type}</Badge></td>
                    <td className="py-3"><Badge tone={m.direction === "IN" ? "green" : "yellow"}>{m.direction}</Badge></td>
                    <td className="py-3">{m.quantity}</td>
                    <td className="py-3 text-gray-600">{m.created_by_username || "—"}</td>
                    <td className="py-3 text-gray-600">{m.notes || "—"}</td>
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