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
  const [togglingId, setTogglingId] = useState(null);

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
  useEffect(() => { document.title = "Products • NURU STORES"; }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function toggleActive(e, p) {
    e.stopPropagation();
    setTogglingId(p.id);
    try {
      if (p.is_active) await catalogApi.deactivateProduct(p.id);
      else await catalogApi.activateProduct(p.id);
      load();
    } catch {
      setErr("Failed to update product status.");
    } finally {
      setTogglingId(null);
    }
  }

  function goEdit(id) {
    nav(`/app/owner/catalog/products/${id}/edit`);
  }

  return (
    <Card>
      <CardHeader
        title="Products"
        subtitle="Tap a product to edit it."
        right={
          <Button onClick={() => nav("/app/owner/catalog/products/new")}>
            New product
          </Button>
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
              title="No products yet"
              subtitle="Create products so the cashier can scan and sell."
              action={
                <Button onClick={() => nav("/app/owner/catalog/products/new")}>
                  Create product
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* ── Desktop table — hidden on mobile ── */}
            <div className="hidden sm:block mt-6">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr className="border-b">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">SKU</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Cost</th>
                    <th className="py-3 pr-4">Qty</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => goEdit(p.id)}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900 truncate max-w-[180px]">
                          {p.name}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 truncate max-w-[120px]">{p.sku}</td>
                      <td className="py-3 pr-4 text-gray-700">{p.selling_price}</td>
                      <td className="py-3 pr-4 text-gray-500">{p.cost_price ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={Number(p.quantity ?? 0) === 0 ? "red" : "green"}>
                          {p.quantity ?? 0}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={p.is_active ? "green" : "red"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant={p.is_active ? "secondary" : "primary"}
                          onClick={(e) => toggleActive(e, p)}
                          disabled={togglingId === p.id}
                        >
                          {togglingId === p.id
                            ? "..."
                            : p.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card rows — hidden on desktop ── */}
            <div className="sm:hidden mt-4 space-y-2">
              {items.map((p) => {
                const qty = Number(p.quantity ?? 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goEdit(p.id)}
                    className="w-full text-left rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:bg-gray-100 transition p-4"
                  >
                    {/* Row 1: name + status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-900 truncate min-w-0">
                        {p.name}
                      </span>
                      <Badge tone={p.is_active ? "green" : "red"} className="flex-shrink-0">
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Row 2: SKU + price */}
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 min-w-0">
                      <span className="truncate">SKU: {p.sku}</span>
                      <span className="text-gray-300 flex-shrink-0">·</span>
                      <span className="flex-shrink-0">Price: {p.selling_price}</span>
                    </div>

                    {/* Row 3: qty badge + toggle — stop propagation on toggle */}
                    <div
                      className="mt-3 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge tone={qty === 0 ? "red" : "green"}>
                        {qty === 0 ? "Out of stock" : `${qty} units`}
                      </Badge>
                      <Button
                        variant={p.is_active ? "secondary" : "primary"}
                        onClick={(e) => toggleActive(e, p)}
                        disabled={togglingId === p.id}
                      >
                        {togglingId === p.id
                          ? "Updating..."
                          : p.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}