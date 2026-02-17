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

  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.title = "Inventory • NURU STORES"; }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  function clearFilter() {
    nav("/app/owner/inventory");
  }

  function goConfig(id) {
    nav(`/app/owner/inventory/${id}/config`);
  }

  return (
    <Card>
      <CardHeader
        title="Inventory"
        subtitle="Tap an item to configure reorder rules."
        right={
          // FIX: flex-wrap so badge + buttons don't overflow on mobile when filter is active
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            {filterLabel ? (
              <>
                <Badge tone={filter === "out" ? "red" : "yellow"}>
                  {filterLabel}
                </Badge>
                <Button variant="secondary" onClick={clearFilter}>
                  Clear
                </Button>
              </>
            ) : null}
            <Button variant="secondary" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => nav("/app/owner/inventory/ops")}>Supply</Button>
          </div>
        }
      />

      <CardBody className="!px-4 !pt-0 sm:!px-6">
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
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No inventory items found"
              subtitle={filterLabel ? `No items match: ${filterLabel}.` : "Try a different search."}
            />
          </div>
        ) : (
          <>
            {/* ── Desktop table — hidden on mobile ── */}
            <div className="hidden sm:block mt-6">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr className="border-b">
                    <th className="py-3 pr-4">Product</th>
                    <th className="py-3 pr-4">SKU</th>
                    <th className="py-3 pr-4">Qty</th>
                    <th className="py-3 pr-4">Reorder %</th>
                    <th className="py-3 pr-4">Reorder level</th>
                    <th className="py-3">Low stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((inv) => {
                    const p = inv.product || {};
                    const qty = Number(inv.quantity ?? 0);
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => goConfig(inv.id)}
                        className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium text-gray-900 truncate max-w-[180px]">
                            {p.name || "—"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.is_active ? "Active" : "Inactive"}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 truncate max-w-[120px]">
                          {p.sku || "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={qty === 0 ? "red" : inv.low_stock_flag ? "yellow" : "green"}>
                            {qty}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {inv.reorder_threshold_percent ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {inv.reorder_level ?? "—"}
                        </td>
                        <td className="py-3">
                          <Badge tone={inv.low_stock_flag ? "yellow" : "gray"}>
                            {inv.low_stock_flag ? "Yes" : "No"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 text-xs text-gray-400">
                Tip: "Out of stock" is qty = 0. "Low stock" depends on your reorder rules + threshold.
              </div>
            </div>

            {/* ── Mobile card rows — hidden on desktop ── */}
            <div className="sm:hidden mt-4 space-y-2">
              {items.map((inv) => {
                const p = inv.product || {};
                const qty = Number(inv.quantity ?? 0);
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => goConfig(inv.id)}
                    className="w-full text-left rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:bg-gray-100 transition p-4"
                  >
                    {/* Row 1: name + qty badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-900 truncate min-w-0">
                        {p.name || "—"}
                      </span>
                      <Badge
                        tone={qty === 0 ? "red" : inv.low_stock_flag ? "yellow" : "green"}
                        className="flex-shrink-0"
                      >
                        {qty} units
                      </Badge>
                    </div>

                    {/* Row 2: SKU + active status */}
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 min-w-0">
                      <span className="truncate">SKU: {p.sku || "—"}</span>
                      <span className="text-gray-300 flex-shrink-0">·</span>
                      <span className="flex-shrink-0">
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Row 3: low stock flag — only show when relevant */}
                    {inv.low_stock_flag || qty === 0 ? (
                      <div className="mt-2">
                        <Badge tone={qty === 0 ? "red" : "yellow"}>
                          {qty === 0 ? "Out of stock" : "Low stock"}
                        </Badge>
                      </div>
                    ) : null}
                  </button>
                );
              })}

              <div className="mt-2 text-xs text-gray-400 px-1">
                Tip: tap any item to configure its reorder rules.
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}