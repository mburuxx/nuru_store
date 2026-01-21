import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryApi } from "../../api/inventory";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

export default function InventoryPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await inventoryApi.listItems({
        search: q || undefined,
        low_stock: lowOnly ? "1" : undefined,
        ordering: "-updated_at",
      });
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [q, lowOnly]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader
        title="Inventory"
        subtitle="Stock levels, reorder settings, low stock flags."
        right={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => nav("/app/owner/inventory/ops")}>Stock Ops</Button>
            <Button onClick={() => nav("/app/owner/inventory/movements")}>Movements</Button>
          </div>
        }
      />
      <CardBody>
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="max-w-md w-full">
            <Input label="Search (name or SKU)" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="e.g. milk or 12345" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={lowOnly} onChange={(e)=>setLowOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No inventory rows" subtitle="Inventory rows are created when products are created." />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b">
                  <th className="py-3">Product</th>
                  <th className="py-3">SKU</th>
                  <th className="py-3">Qty</th>
                  <th className="py-3">Reorder</th>
                  <th className="py-3">Flag</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-gray-900">{row.product?.name}</td>
                    <td className="py-3 text-gray-600">{row.product?.sku}</td>
                    <td className="py-3">{row.quantity}</td>
                    <td className="py-3 text-gray-600">
                      {row.reorder_level == null
                        ? "Not set"
                        : `Level ${row.reorder_level} @ ${row.reorder_threshold_percent}% → point ${row.reorder_point}`}
                    </td>
                    <td className="py-3">
                      <Badge tone={row.low_stock_flag ? "red" : "green"}>
                        {row.low_stock_flag ? "LOW" : "OK"}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => nav(`/app/owner/inventory/${row.id}/config`)}
                      >
                        Configure
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