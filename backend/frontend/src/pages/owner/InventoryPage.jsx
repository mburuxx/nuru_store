// src/pages/owner/InventoryPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { inventoryApi } from "../../api/inventory";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

export default function InventoryPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const filter = sp.get("filter"); // "low" | "out" | null

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const filterLabel = useMemo(() => {
    if (filter === "low") return "Low stock";
    if (filter === "out") return "Out of stock";
    return null;
  }, [filter]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      // backend supports low_stock=1; out-of-stock we filter client-side (quantity==0)
      const params = {
        search: q || undefined,
        ordering: "-updated_at",
        low_stock: filter === "low" ? "1" : undefined,
      };

      const res = await inventoryApi.listItems(params);
      const rows = res.data?.results || res.data || [];

      const finalRows = filter === "out" ? rows.filter((x) => Number(x.quantity) === 0) : rows;
      setItems(finalRows);
    } catch {
      setErr("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
  document.title = "Inventory • NURU STORES";
}, []);

  // Debounce search (small + smooth)
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  function clearFilter() {
    // keep user in inventory page but remove filter query
    nav("/app/owner/inventory");
  }

  return (
    <Card>
      <CardHeader
        title="Inventory"
        subtitle="Track quantities and stock health."
        right={
          <div className="flex items-end gap-2">
            {filterLabel ? (
              <div className="flex items-center gap-2">
                <Badge tone={filter === "out" ? "red" : "yellow"}>Filtered: {filterLabel}</Badge>
                <Button variant="secondary" onClick={clearFilter}>
                  Clear filter
                </Button>
              </div>
            ) : null}
            <Button variant="secondary" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => nav("/app/owner/inventory/ops")}>Supply</Button>
          </div>
        }
      />

      <CardBody>
        <div className="max-w-md">
          <Input
            label="Search by name or SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. milk or 12345"
          />
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4">
            <Loader />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No inventory items found"
              subtitle={filterLabel ? `No items match: ${filterLabel}.` : "Try a different search."}
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b">
                  <th className="py-3">Product</th>
                  <th className="py-3">SKU</th>
                  <th className="py-3">Qty</th>
                  <th className="py-3">Reorder %</th>
                  <th className="py-3">Reorder level</th>
                  <th className="py-3">Low stock</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const inv = row;
                  const p = inv.product || {};
                  const qty = Number(inv.quantity ?? 0);

                  return (
                    <tr key={inv.id} className="border-b last:border-b-0">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">{p.name || "—"}</div>
                        <div className="text-xs text-gray-500">{p.is_active ? "Active" : "Inactive"}</div>
                      </td>
                      <td className="py-3 text-gray-600">{p.sku || "—"}</td>
                      <td className="py-3">
                        <Badge tone={qty === 0 ? "red" : inv.low_stock_flag ? "yellow" : "green"}>
                          {qty}
                        </Badge>
                      </td>
                      <td className="py-3">{inv.reorder_threshold_percent ?? "—"}</td>
                      <td className="py-3">{inv.reorder_level ?? "—"}</td>
                      <td className="py-3">
                        <Badge tone={inv.low_stock_flag ? "yellow" : "gray"}>
                          {inv.low_stock_flag ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => nav(`/app/owner/inventory/${inv.id}/config`)}
                        >
                          Configure
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 text-xs text-gray-500">
              Tip: “Out of stock” is qty = 0. “Low stock” depends on your reorder rules + threshold.
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}