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

/** Donut chart (SVG) */
function DonutChart({ segments = [], size = 140, stroke = 18, centerLabel = "Mix" }) {
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0);
  if (!total) return <div className="text-sm text-gray-600">No data yet.</div>;

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;
  const arcs = segments
    .filter((s) => Number(s.value || 0) > 0)
    .map((seg) => {
      const v = Number(seg.value || 0);
      const pct = v / total;
      const dash = pct * c;
      const gap = c - dash;
      const offset = (acc / total) * c;
      acc += v;
      return { ...seg, dash, gap, offset };
    });

  const palette = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#6B7280"];

  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - stroke) / 2}
            stroke="#E5E7EB"
            strokeWidth={stroke}
            fill="none"
          />
          {arcs.map((a, i) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={(size - stroke) / 2}
              fill="none"
              stroke={a.color || palette[i % palette.length]}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ))}
        </svg>

        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="text-xs text-gray-500">{centerLabel}</div>
          <div className="text-lg font-semibold text-gray-900">{total}</div>
          <div className="text-[11px] text-gray-500">sales</div>
        </div>
      </div>

      <div className="min-w-[160px] space-y-2">
        {segments.map((s, i) => {
          const v = Number(s.value || 0);
          const pct = total ? Math.round((v / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: s.color || palette[i % palette.length] }}
                />
                <span className="text-gray-700 truncate">{s.label}</span>
              </div>
              <div className="text-gray-900 font-semibold">
                {v} <span className="text-gray-400 font-normal text-xs">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

  // build payment mix from recent sales (no backend changes needed)
  const paymentMixSegments = useMemo(() => {
    const counts = {};
    for (const s of recent || []) {
      const k = (s.payment_method || "UNKNOWN").toUpperCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    const entries = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    return entries.length
      ? entries
      : [{ label: "No recent sales", value: 0 }];
  }, [recent]);

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
              {/* ✅ REPLACED: Revenue trend -> Payment methods mix */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Payment methods</div>
                  <Badge tone="blue">Recent</Badge>
                </div>
                <div className="mt-4">
                  <DonutChart segments={paymentMixSegments} centerLabel="Payments" />
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Useful check: if one method dominates (e.g. CASH), you can balance handling or confirm POS habits.
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