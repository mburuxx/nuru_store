import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

function formatMoney(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return String(v ?? "0");
  return n.toFixed(2);
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function LineChart({ points = [], height = 120 }) {
  if (!points.length) return <div className="text-sm text-gray-600">No data in this range.</div>;

  const values = points.map((p) => Number(p.revenue || 0));
  const max = Math.max(...values, 1);

  const w = 520;
  const h = height;
  const step = w / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - (Number(p.revenue || 0) / max) * (h - 12) - 6;
    return [x, y];
  });

  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="#E5E7EB" strokeWidth="1" />
      <path d={d} stroke="#1D4ED8" strokeWidth="2.5" fill="none" />
      {coords.map(([x, y], idx) => <circle key={idx} cx={x} cy={y} r="3" fill="#1D4ED8" />)}
    </svg>
  );
}

export default function CashierDashboard() {
  const nav = useNavigate();
  const [days, setDays] = useState("30");
  const params = useMemo(() => ({ days: Number(days) }), [days]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [recent, setRecent] = useState([]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        dashboardApi.cashierSummary(params),
        dashboardApi.cashierSalesTrend({ ...params, period: "day" }),
        dashboardApi.cashierRecentSales({ limit: 8 }),
      ]);
      setSummary(a.data);
      setTrend(b.data);
      setRecent(c.data || []);
    } catch {
      setErr("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const points = useMemo(() => (trend?.data || []).map((r) => ({
    bucket: r.bucket,
    revenue: Number(r.revenue || 0),
    count: r.count,
  })), [trend]);

  return (
    <Card>
      <CardHeader
        title="Dashboard"
        subtitle="Quick start and your sales overview."
        right={
          <div className="flex gap-2 items-end">
            <div className="w-44">
              <Select label="Range" value={days} onChange={(e) => setDays(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
            <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
            <Button onClick={() => nav("/app/cashier/pos")}>Open POS</Button>
          </div>
        }
      />

      <CardBody>
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Revenue" value={formatMoney(summary?.revenue)} />
              <Stat label="Sales count" value={summary?.sales_count ?? 0} />
              <Stat label="Avg sale" value={formatMoney(summary?.avg_sale)} />
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Revenue trend</div>
                  <Badge tone="blue">Daily</Badge>
                </div>
                <div className="mt-4">
                  <LineChart points={points} />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Recent sales</div>
                  <Button variant="ghost" onClick={() => nav("/app/sales")}>View all</Button>
                </div>

                <div className="mt-4 space-y-2">
                  {recent.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => nav(`/app/sales/${s.id}`)}
                      className="w-full text-left rounded-xl bg-gray-50 hover:bg-gray-100 transition p-3 text-sm flex items-center justify-between"
                    >
                      <span className="text-gray-700">Sale #{s.id} • {s.payment_method}</span>
                      <span className="font-semibold text-gray-900">{formatMoney(s.total)}</span>
                    </button>
                  ))}
                  {!recent.length ? (
                    <div className="text-sm text-gray-600">No recent sales.</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => nav("/app/cashier/pos")}
                className="rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition p-4 text-left"
              >
                <div className="font-semibold text-gray-900">Make a sale</div>
                <div className="text-sm text-gray-600 mt-1">Open POS and checkout quickly.</div>
                <div className="text-xs text-blue-800 mt-3 font-semibold">Open →</div>
              </button>

              <button
                type="button"
                onClick={() => nav("/app/cashier/catalog")}
                className="rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition p-4 text-left"
              >
                <div className="font-semibold text-gray-900">Browse catalog</div>
                <div className="text-sm text-gray-600 mt-1">Search products and stock.</div>
                <div className="text-xs text-blue-800 mt-3 font-semibold">Open →</div>
              </button>

              <button
                type="button"
                onClick={() => nav("/app/cashier/scan")}
                className="rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition p-4 text-left"
              >
                <div className="font-semibold text-gray-900">Scan SKU</div>
                <div className="text-sm text-gray-600 mt-1">Fast lookup by barcode/SKU.</div>
                <div className="text-xs text-blue-800 mt-3 font-semibold">Open →</div>
              </button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}