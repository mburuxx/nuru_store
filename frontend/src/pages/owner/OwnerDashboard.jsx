// src/pages/owner/OwnerDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { notificationsApi } from "../../api/notifications";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatMoney(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return String(v ?? "0");
  return n.toFixed(2);
}

/**
 * If onClick is provided => renders a button-like card (clickable).
 * Otherwise renders a normal div.
 */
function StatCard({ title, value, hint, tone = "blue", onClick }) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 border-blue-100"
      : tone === "red"
      ? "bg-red-50 border-red-100"
      : "bg-gray-50 border-gray-100";

  const clickable = typeof onClick === "function";

  const Base = (
    <>
      <div className="text-xs text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-600">{hint}</div> : null}
    </>
  );

  if (!clickable) {
    return <div className={cn("rounded-2xl border p-4", toneClass)}>{Base}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition",
        toneClass,
        "hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0",
        "focus:outline-none focus:ring-2 focus:ring-blue-600/30"
      )}
      title={`Open ${title.toLowerCase()} list`}
    >
      {Base}
      <div className="mt-2 text-xs font-semibold text-blue-800">View list →</div>
    </button>
  );
}

/** Simple SVG line chart (no external libs) */
function LineChart({ points = [], height = 120 }) {
  if (!points.length) {
    return <div className="text-sm text-gray-600">No data in this range.</div>;
  }

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

  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="#E5E7EB" strokeWidth="1" />
      <path d={d} stroke="#1D4ED8" strokeWidth="2.5" fill="none" />
      {coords.map(([x, y], idx) => (
        <circle key={idx} cx={x} cy={y} r="3" fill="#1D4ED8" />
      ))}
    </svg>
  );
}

function QuickAction({ title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition p-4"
    >
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
      <div className="text-xs text-blue-800 mt-3 font-semibold">Open →</div>
    </button>
  );
}

export default function OwnerDashboard() {
  const nav = useNavigate();
  const [days, setDays] = useState("30");
  const params = useMemo(() => ({ days: Number(days) }), [days]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [top, setTop] = useState([]);
  const [health, setHealth] = useState(null);
  const [recent, setRecent] = useState(null);

  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const [a, b, c, d, e, f] = await Promise.all([
        dashboardApi.summary(params),
        dashboardApi.salesTrend({ ...params, period: "day" }),
        dashboardApi.topProducts({ ...params, limit: 6 }),
        dashboardApi.inventoryHealth(),
        dashboardApi.recentActivity(),
        notificationsApi.unreadCount(),
      ]);
      setSummary(a.data);
      setTrend(b.data);
      setTop(c.data?.data || []);
      setHealth(d.data);
      setRecent(e.data);
      setUnread(f.data?.unread_count ?? 0);
    } catch {
      setErr("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const trendPoints = useMemo(() => {
    const rows = trend?.data || [];
    return rows.map((r) => ({ bucket: r.bucket, revenue: Number(r.revenue || 0), count: r.count }));
  }, [trend]);

  return (
    <Card>
      <CardHeader
        title="Dashboard"
        subtitle="Business overview and quick actions."
        right={
          <div className="flex gap-2 items-end">
            <div className="w-44">
              <Select label="Range" value={days} onChange={(e) => setDays(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
            <Button variant="secondary" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => nav("/app/notifications")}>
              Alerts <span className="ml-2"><Badge tone="blue">{unread}</Badge></span>
            </Button>
          </div>
        }
      />

      <CardBody>
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard title="Revenue" value={formatMoney(summary?.revenue)} hint={`Last ${days} days`} tone="blue" />
              <StatCard title="Sales count" value={summary?.sales_count ?? 0} tone="gray" />
              <StatCard title="Avg sale" value={formatMoney(summary?.avg_sale)} tone="gray" />

              {/* CLICKABLE */}
              <StatCard
                title="Low stock"
                value={summary?.low_stock_count ?? 0}
                hint="Needs reorder"
                tone="red"
                onClick={() => nav("/app/owner/inventory?filter=low")}
              />

              {/* CLICKABLE */}
              <StatCard
                title="Out of stock"
                value={summary?.out_of_stock_count ?? 0}
                tone="red"
                onClick={() => nav("/app/owner/inventory?filter=out")}
              />
            </div>

            {/* Quick actions */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">Quick actions</div>
                <div className="text-sm text-gray-600">Jump to key workflows</div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <QuickAction
                  title="Supply stock"
                  subtitle="Record deliveries and replenish inventory."
                  onClick={() => nav("/app/owner/inventory/ops")}
                />
                <QuickAction
                  title="Create product"
                  subtitle="Add new items with SKU, price, category."
                  onClick={() => nav("/app/owner/catalog/products/new")}
                />
                <QuickAction
                  title="View inventory"
                  subtitle="See quantities, low stock and search."
                  onClick={() => nav("/app/owner/inventory")}
                />
                <QuickAction
                  title="Sales & receipts"
                  subtitle="Browse sales, open receipts, void if needed."
                  onClick={() => nav("/app/sales")}
                />
              </div>
            </div>

            {/* Charts + lists */}
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Revenue trend</div>
                  <Badge tone="blue">Daily</Badge>
                </div>
                <div className="mt-4">
                  <LineChart points={trendPoints} />
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Tip: consistent slope = stable sales. dips = investigate out-of-stock or slow days.
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Top products</div>
                  <Button variant="ghost" onClick={() => nav("/app/owner/catalog/products")}>
                    Manage products
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {top.length ? top.map((p) => (
                    <div key={p.product_id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{p.qty} sold</div>
                        <div className="text-xs text-gray-500">{formatMoney(p.revenue)}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-600">No data yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory health + activity */}
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Inventory health</div>
                  <Button variant="ghost" onClick={() => nav("/app/owner/inventory")}>Open inventory</Button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Total SKUs</div>
                    <div className="font-semibold">{health?.total_skus ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Total units</div>
                    <div className="font-semibold">{health?.total_units ?? 0}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-400">LOW STOCK (Top 6)</div>
                  <div className="mt-2 space-y-2">
                    {(health?.low_stock_items || []).slice(0, 6).map((x) => (
                      <button
                        key={x.product_id}
                        type="button"
                        onClick={() => nav(`/app/owner/catalog/products/${x.product_id}/edit`)}
                        className="w-full flex items-center justify-between rounded-xl bg-gray-50 hover:bg-gray-100 transition p-3 text-sm"
                      >
                        <span className="text-gray-800">{x.name} ({x.sku})</span>
                        <Badge tone="red">{x.quantity}</Badge>
                      </button>
                    ))}
                    {!health?.low_stock_items?.length ? (
                      <div className="text-sm text-gray-600">No low stock items.</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Recent activity</div>
                  <Button variant="ghost" onClick={() => nav("/app/notifications")}>Open alerts</Button>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-400">LATEST STOCK MOVEMENTS</div>
                  <div className="mt-2 space-y-2">
                    {(recent?.stock_movements || []).slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
                        <div className="text-gray-700">
                          <span className="font-medium text-gray-900">{m.product_name}</span>{" "}
                          <span className="text-xs text-gray-500">({m.sku})</span>
                          <div className="text-xs text-gray-500">{m.movement_type} {m.direction}</div>
                        </div>
                        <Badge tone={m.direction === "IN" ? "green" : "yellow"}>{m.quantity}</Badge>
                      </div>
                    ))}
                    {!recent?.stock_movements?.length ? (
                      <div className="text-sm text-gray-600">No movements yet.</div>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-400">LATEST NOTIFICATIONS</div>
                    <div className="mt-2 space-y-2">
                      {(recent?.notifications || []).slice(0, 5).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => nav("/app/notifications")}
                          className="w-full text-left rounded-xl bg-gray-50 hover:bg-gray-100 transition p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">{n.message}</span>
                            <Badge tone={n.is_read ? "gray" : "blue"}>{n.is_read ? "Read" : "New"}</Badge>
                          </div>
                        </button>
                      ))}
                      {!recent?.notifications?.length ? (
                        <div className="text-sm text-gray-600">No notifications yet.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}