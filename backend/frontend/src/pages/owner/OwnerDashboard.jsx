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

/** Donut chart (SVG) */
function DonutChart({ segments = [], size = 140, stroke = 18, centerLabel = "Inventory" }) {
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

  // keep it “business console” — clean muted palette
  const palette = ["#2563EB", "#F59E0B", "#EF4444", "#10B981", "#6B7280"];

  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#E5E7EB"
            strokeWidth={stroke}
            fill="none"
          />
          {arcs.map((a, i) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
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
          <div className="text-[11px] text-gray-500">SKUs</div>
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

  useEffect(() => {
    document.title = "Dashboard • NURU STORES";
  }, []);

  // --- inventory donut data (uses existing backend fields you already have)
  const inventorySegments = useMemo(() => {
    const totalSkus = Number(health?.total_skus || 0);

    // prefer summary counts if available (likely accurate & fast)
    const out = Number(summary?.out_of_stock_count ?? 0);
    const low = Number(summary?.low_stock_count ?? 0);

    const inStock = Math.max(0, totalSkus - low - out);

    return [
      { label: "In stock", value: inStock, color: "#2563EB" },
      { label: "Low stock", value: low, color: "#F59E0B" },
      { label: "Out of stock", value: out, color: "#EF4444" },
    ];
  }, [health, summary]);

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
              {/* ✅ REPLACED: Revenue trend -> Inventory status donut */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Inventory status</div>
                  <Badge tone="blue">SKUs</Badge>
                </div>
                <div className="mt-4">
                  <DonutChart segments={inventorySegments} centerLabel="Inventory" />
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Quick read: keep “Low stock” small, and “Out of stock” near zero.
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