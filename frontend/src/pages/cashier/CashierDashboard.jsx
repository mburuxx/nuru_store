import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function CashierDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sales, setSales] = useState([]);

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const t = todayISO();
        const res = await salesApi.list({ date_from: t, date_to: t });
        const rows = res.data?.results || res.data || [];
        setSales(rows);
      } catch {
        setErr("Failed to load your sales.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const summary = useMemo(() => {
    const completed = sales.filter((s) => s.status === "COMPLETED");
    const total = completed.reduce((sum, s) => sum + Number(s.total || 0), 0);
    return {
      count: completed.length,
      total,
      recent: sales.slice(0, 8),
    };
  }, [sales]);

  return (
    <Card>
      <CardHeader
        title="Cashier Dashboard"
        subtitle="Quick actions + your sales today."
        right={
          <div className="flex gap-2">
            <Button onClick={() => nav("/app/cashier/pos")}>Open POS</Button>
            <Button variant="secondary" onClick={() => nav("/app/cashier/scan")}>Scan SKU</Button>
          </div>
        }
      />
      <CardBody>
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Today</div>
                <div className="mt-1 text-2xl font-semibold">{summary.count}</div>
                <div className="text-sm text-gray-600">completed sales</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Today revenue</div>
                <div className="mt-1 text-2xl font-semibold">{summary.total.toFixed(2)}</div>
                <div className="text-sm text-gray-600">completed totals</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs text-gray-500">Shortcuts</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => nav("/app/cashier/catalog")}>Catalog</Button>
                  <Button variant="ghost" onClick={() => nav("/app/sales")}>My Sales</Button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">Recent sales</div>
                <Button variant="secondary" onClick={() => nav("/app/sales")}>View all</Button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 border-b">
                    <tr>
                      <th className="py-3">When</th>
                      <th className="py-3">ID</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Total</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent.map((s) => (
                      <tr key={s.id} className="border-b last:border-b-0">
                        <td className="py-3 text-gray-600">{new Date(s.created_at).toLocaleString()}</td>
                        <td className="py-3 font-medium">#{s.id}</td>
                        <td className="py-3">
                          <Badge tone={s.status === "VOIDED" ? "red" : "green"}>{s.status}</Badge>
                        </td>
                        <td className="py-3">{s.total}</td>
                        <td className="py-3 text-right">
                          <Button variant="ghost" onClick={() => nav(`/app/sales/${s.id}`)}>View</Button>
                        </td>
                      </tr>
                    ))}
                    {summary.recent.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-gray-500">
                          No sales yet today. Open POS to start.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}