import React, { useState } from "react";
import { catalogApi } from "../../api/catalog";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

export default function ScanSkuPage() {
  const [sku, setSku] = useState("");
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setErr("");
    setItem(null);
    if (!sku.trim()) return;

    setLoading(true);
    try {
      const res = await catalogApi.getBySku(sku.trim());
      setItem(res.data);
    } catch {
      setErr("Product not found for that SKU.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Scan / Lookup SKU" subtitle="Fast cashier lookup flow." />
      <CardBody>
        <form onSubmit={lookup} className="flex flex-col md:flex-row gap-3 max-w-2xl">
          <div className="flex-1">
            <Input
              label="SKU"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Scan barcode or type SKU"
            />
          </div>
          <div className="md:pt-7">
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Find product"}
            </Button>
          </div>
        </form>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {item ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-500 mt-1">SKU: {item.sku}</div>
                <div className="text-sm text-gray-500">Category: {item.category?.name || "—"}</div>
              </div>
              <Badge tone={item.is_active ? "green" : "red"}>{item.is_active ? "Active" : "Inactive"}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Selling price</div>
                <div className="font-semibold">{item.selling_price}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Quantity</div>
                <div className="font-semibold">{item.quantity ?? 0}</div>
              </div>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}