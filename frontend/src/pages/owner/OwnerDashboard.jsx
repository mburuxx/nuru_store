import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryApi } from "../../api/inventory";
import { salesApi } from "../../api/sales";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function OwnerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [lowStock, setLowStock] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [voided, setVoided] = useState([]);

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const t = todayISO();
        const [lowRes, salesRes, voidRes] = await Promise.all([
          inventoryApi.listItems({ low_stock: "1" }),
          salesApi.list({ status: "COMPLETED", date_from: t, date_to: t }),
          salesApi.list({ status: "VOIDED" }),
        ]);

        setLowStock(lowRes.data?.results || lowRes.data || []);
        setTodaySales(salesRes.data?.results || salesRes.data || []);
        setVoided((voidRes.data?.results || voidRes.data || []).slice(0, 6));
      } catch {
        setErr("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totals = useMemo(() => {
    const total = todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    return { count: todaySales.length, total };
  }, [todaySales]);

  return (
    <Card>
      <CardHeader
        title="Owner Dashboard"
        subtitle="Low stock, today sales, and quick actions."
        right={
          <div className="flex gap-2">
            <Button onClick={() => nav("/app/owner/inventory")}>Inventory</Button>
            <Button variant="secondary" onClick={() => nav("/app/sales")}>Sales</Button>
          </div>
        }
      />
      <CardBody>
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Low stock items</div>
                <div className="mt-1 text-2xl font-semibold">{lowStock.length}</div>
                <div className="mt-3">
                  <Button variant="ghost" onClick={() => nav("/app/owner/inventory")}>View inventory</Button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Today sales</div>
                <div className="mt-1 text-2xl font-semibold">{totals.count}</div>
                <div className="text-sm text-gray-600">completed transactions</div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Today revenue</div>
                <div className="mt-1 text-2xl font-semibold">{totals.total.toFixed(2)}</div>
                <div className="text-sm text-gray-600">completed totals</div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Quick actions</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => nav("/app/owner/inventory/ops")}>Stock Ops</Button>
                  <Button variant="ghost" onClick={() => nav("/app/owner/catalog/products")}>Products</Button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Low stock (top)</div>
                  <Button variant="secondary" onClick={() => nav("/app/owner/inventory")}>Open</Button>
                </div>

                <div className="mt-4 space-y-2">
                  {lowStock.slice(0, 6).map((x) => (
                    <div key={x.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <div>
                        <div className="font-medium">{x.product?.name}</div>
                        <div className="text-xs text-gray-500">{x.product?.sku}</div>
                      </div>
                      <div className="text-right">
                        <Badge tone="red">LOW</Badge>
                        <div className="text-sm font-semibold mt-1">{x.quantity}</div>
                      </div>
                    </div>
                  ))}
                  {lowStock.length === 0 ? (
                    <div className="text-sm text-gray-600">All good. No low stock items right now.</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Recent voids</div>
                  <Button variant="secondary" onClick={() => nav("/app/sales?status=VOIDED")}>View</Button>
                </div>

                <div className="mt-4 space-y-2">
                  {voided.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <div>
                        <div className="font-medium">Sale #{s.id}</div>
                        <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <Badge tone="red">VOIDED</Badge>
                        <div className="text-sm font-semibold mt-1">{s.total}</div>
                      </div>
                    </div>
                  ))}
                  {voided.length === 0 ? (
                    <div className="text-sm text-gray-600">No voided sales yet.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}