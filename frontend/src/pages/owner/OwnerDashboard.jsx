// src/pages/owner/OwnerDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { notificationsApi } from "../../api/notifications";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

// ── Brand token ───────────────────────────────────────────────────
const BRAND = "#1B2A4A";

function cn(...xs) { return xs.filter(Boolean).join(" "); }

function formatMoney(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return String(v ?? "0");
  return n.toFixed(2);
}

// ── KPI Stat card ─────────────────────────────────────────────────
function StatCard({ title, value, hint, tone = "neutral", onClick }) {
  const tones = {
    brand:   "bg-[#1B2A4A] border-[#1B2A4A] text-white",
    amber:   "bg-amber-50 border-amber-200",
    red:     "bg-red-50 border-red-100",
    neutral: "bg-stone-50 border-stone-200",
  };

  const valueColor = tone === "brand" ? "text-white" : "text-[#1B2A4A]";
  const labelColor = tone === "brand" ? "text-white/70" : "text-stone-500";
  const hintColor  = tone === "brand" ? "text-white/60" : "text-stone-400";
  const arrowColor = tone === "brand" ? "text-white/80" : "text-amber-600";

  const clickable = typeof onClick === "function";
  const base = cn(
    "rounded-2xl border p-4 min-w-0 transition-all duration-150",
    tones[tone] || tones.neutral,
    clickable && "cursor-pointer hover:shadow-md hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.99]"
  );

  const inner = (
    <>
      <div className={cn("text-xs font-medium truncate uppercase tracking-wide", labelColor)}>{title}</div>
      <div className={cn("mt-1.5 text-2xl font-bold break-words tabular-nums", valueColor)}>{value}</div>
      {hint ? <div className={cn("mt-0.5 text-xs truncate", hintColor)}>{hint}</div> : null}
      {clickable ? <div className={cn("mt-2 text-xs font-semibold", arrowColor)}>View list →</div> : null}
    </>
  );

  return clickable
    ? <button type="button" onClick={onClick} className={cn(base, "text-left w-full")}>{inner}</button>
    : <div className={base}>{inner}</div>;
}


function useResizeWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setWidth(w);
    });
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));

    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

function formatCompact(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

function niceMax(value) {
  // rounds up to a "nice" tick max (1,2,5 * 10^k)
  const v = Math.max(1, value);
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;

  let nice;
  if (f <= 1) nice = 1;
  else if (f <= 2) nice = 2;
  else if (f <= 5) nice = 5;
  else nice = 10;

  return nice * base;
}

function safeLabel(label) {
  // If label is ISO date, show MM-DD. Otherwise show as-is (shortened).
  const s = String(label ?? "");
  // matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(5);
  return s.length > 10 ? s.slice(0, 10) + "…" : s;
}

/**
 * RevenueBarChart
 * - Responsive width via ResizeObserver
 * - Nice y-axis ticks (0..niceMax)
 * - Baseline + soft grid
 * - Hover tooltip + bar highlight
 */
export function RevenueBarChart({ data = [], height = 180 }) {
  const gradientId = useId();
  const [wrapRef, width] = useResizeWidth();
  const [hover, setHover] = useState(null);

  const PAD = { top: 12, right: 16, bottom: 34, left: 52 };
  const W = Math.max(0, width - PAD.left - PAD.right);
  const H = Math.max(0, height - PAD.top - PAD.bottom);

  const parsed = useMemo(() => {
    const values = data.map((d) => Number(d.revenue ?? d.total ?? d.value ?? 0));
    const labels = data.map((d) => d.date ?? d.label ?? "");
    const maxRaw = Math.max(...values, 1);
    const maxV = niceMax(maxRaw);

    // ticks: 0, 25%, 50%, 75%, 100%
    const tickFracs = [0, 0.25, 0.5, 0.75, 1];
    const yTicks = tickFracs.map((f) => ({
      y: PAD.top + H - f * H,
      v: f * maxV,
      label: formatCompact(f * maxV),
      isBase: f === 0,
    }));

    const n = Math.max(1, data.length);
    const slot = W / n;

    // nicer look: clamp bar width and keep reasonable gaps
    const barW = Math.min(26, Math.max(6, slot * 0.62));
    const x0 = PAD.left;

    const bars = values.map((v, i) => {
      const barH = (v / maxV) * H;
      const cx = x0 + i * slot + slot / 2;
      const x = cx - barW / 2;
      const y = PAD.top + H - barH;

      return {
        i,
        x,
        y,
        w: barW,
        h: Math.max(2, barH),
        value: v,
        label: labels[i],
        cx,
      };
    });

    // x labels: show up to ~6 labels depending on count
    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    const xLabelIdxs = Array.from({ length: n }, (_, i) => i).filter(
      (i) => i === 0 || i === n - 1 || i % step === 0
    );

    return { values, labels, bars, yTicks, xLabelIdxs, maxV };
  }, [data, H, PAD.top, W]);

  if (!data.length) {
    return (
      <div ref={wrapRef} className="flex items-center justify-center h-32 text-sm text-stone-400">
        No trend data yet for this period.
      </div>
    );
  }

  // If width hasn't been measured yet, keep layout stable
  if (!width) {
    return <div ref={wrapRef} style={{ height }} className="w-full" />;
  }

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    // find nearest bar by center x
    let best = null;
    let bestDist = Infinity;

    for (const b of parsed.bars) {
      const dist = Math.abs(mx - b.cx);
      if (dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }
    if (!best) return;

    // only activate if mouse is inside plot area (optional feel)
    const inPlot = mx >= PAD.left && mx <= (width - PAD.right);
    setHover(inPlot ? best : null);
  };

  const onLeave = () => setHover(null);

  return (
    <div ref={wrapRef} className="w-full">
      <svg
        width={width}
        height={height}
        className="block w-full"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        role="img"
        aria-label="Revenue trend chart"
      >
        <defs>
          <linearGradient id={`barGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity="0.95" />
            <stop offset="100%" stopColor={BRAND} stopOpacity="0.35" />
          </linearGradient>

          <filter id={`softShadow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* grid + y labels */}
        {parsed.yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={PAD.left}
              y1={t.y}
              x2={width - PAD.right}
              y2={t.y}
              stroke={t.isBase ? "#d6d3d1" : "#eee"}
              strokeWidth={t.isBase ? 1.2 : 1}
              strokeDasharray={t.isBase ? "none" : "4 4"}
            />
            <text
              x={PAD.left - 10}
              y={t.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#a8a29e"
              fontFamily="system-ui, sans-serif"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* bars */}
        {parsed.bars.map((b) => {
          const active = hover?.i === b.i;
          return (
            <g key={b.i}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx="7"
                fill={`url(#barGrad-${gradientId})`}
                opacity={hover ? (active ? 1 : 0.45) : 1}
                filter={active ? `url(#softShadow-${gradientId})` : "none"}
              />
              {/* subtle top cap for active bar */}
              {active && (
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={Math.min(4, b.h)}
                  rx="7"
                  fill="#D4AF37"
                />
              )}
            </g>
          );
        })}

        {/* x labels */}
        {parsed.xLabelIdxs.map((i) => {
          const b = parsed.bars[i];
          if (!b) return null;
          return (
            <text
              key={i}
              x={b.cx}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#a8a29e"
              fontFamily="system-ui, sans-serif"
            >
              {safeLabel(b.label)}
            </text>
          );
        })}

        {/* hover guide + tooltip */}
        {hover && (
          <g>
            <line
              x1={hover.cx}
              y1={PAD.top}
              x2={hover.cx}
              y2={height - PAD.bottom}
              stroke="#d6d3d1"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* tooltip box */}
            {(() => {
              const tipW = 140;
              const tipH = 44;
              const x = Math.min(width - PAD.right - tipW, Math.max(PAD.left, hover.cx - tipW / 2));
              const y = PAD.top + 6;

              return (
                <g>
                  <rect x={x} y={y} width={tipW} height={tipH} rx="10" fill="white" stroke="#eee" />
                  <text
                    x={x + 12}
                    y={y + 18}
                    fontSize="10"
                    fill="#78716c"
                    fontFamily="system-ui, sans-serif"
                  >
                    {safeLabel(hover.label)}
                  </text>
                  <text
                    x={x + 12}
                    y={y + 34}
                    fontSize="12"
                    fill="#111"
                    fontFamily="system-ui, sans-serif"
                    fontWeight="600"
                  >
                    {formatCompact(hover.value)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}


// ── Donut (kept — moved to inventory health section) ──────────────
function DonutChart({ segments = [], size = 110, stroke = 14, centerLabel = "SKUs" }) {
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0);
  if (!total) return <div className="text-sm text-stone-400">No data.</div>;

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const palette = [BRAND, "#F59E0B", "#EF4444"];

  const arcs = segments
    .filter((s) => Number(s.value || 0) > 0)
    .map((seg) => {
      const v = Number(seg.value || 0);
      const dash = (v / total) * c;
      const gap = c - dash;
      const offset = (acc / total) * c;
      acc += v;
      return { ...seg, dash, gap, offset };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} stroke="#f0ede8" strokeWidth={stroke} fill="none" />
          {arcs.map((a, i) => (
            <circle
              key={a.label}
              cx={size/2} cy={size/2} r={r}
              fill="none"
              stroke={a.color || palette[i % palette.length]}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div className="text-lg font-bold" style={{ color: BRAND }}>{total}</div>
          <div className="text-[10px] text-stone-400">{centerLabel}</div>
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {segments.map((s, i) => {
          const v = Number(s.value || 0);
          const pct = total ? Math.round((v / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: s.color || palette[i % palette.length] }} />
                <span className="text-stone-600 truncate">{s.label}</span>
              </div>
              <span className="font-semibold text-stone-800 flex-shrink-0 tabular-nums">
                {v} <span className="text-stone-400 font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────
function QuickAction({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-stone-200/70 bg-white hover:bg-stone-50 hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0 transition-all duration-150 p-4 w-full min-w-0"
    >
      {icon ? <div className="mb-2 text-amber-500">{icon}</div> : null}
      <div className="font-semibold text-[#1B2A4A] truncate text-sm">{title}</div>
      <div className="text-xs text-stone-500 mt-0.5 break-words">{subtitle}</div>
      <div className="text-xs font-semibold text-amber-600 mt-2">Open →</div>
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="font-semibold text-[#1B2A4A]">{title}</div>
      {action}
    </div>
  );
}

// ── Quick action icons ────────────────────────────────────────────
const IconSupply = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconProduct = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 2h12l2 6H4L6 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconInventory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M3 7l9 4m0 10V11m9-4l-9 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);
const IconSales = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────
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
        dashboardApi.topProducts({ ...params, limit: 5 }),
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

  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.title = "Dashboard • NURU STORES"; }, []);

  const inventorySegments = useMemo(() => {
    const totalSkus = Number(health?.total_skus || 0);
    const out = Number(summary?.out_of_stock_count ?? 0);
    const low = Number(summary?.low_stock_count ?? 0);
    const inStock = Math.max(0, totalSkus - low - out);
    return [
      { label: "In stock",      value: inStock, color: BRAND },
      { label: "Low stock",     value: low,     color: "#F59E0B" },
      { label: "Out of stock",  value: out,     color: "#EF4444" },
    ];
  }, [health, summary]);

  // Normalise trend data — handle both array and object shapes
  const trendData = useMemo(() => {
    if (!trend) return [];
    if (Array.isArray(trend)) return trend;
    if (Array.isArray(trend?.data)) return trend.data;
    if (Array.isArray(trend?.results)) return trend.results;
    return [];
  }, [trend]);

  return (
    <Card>
      <CardHeader
        title="Dashboard"
        subtitle="Business overview and quick actions."
        right={
          <div className="flex flex-wrap gap-2 items-end justify-end w-full">
            <div className="w-full sm:w-44">
              <Select label="Range" value={days} onChange={(e) => setDays(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
              <Button onClick={() => nav("/app/notifications")}>
                Alerts {unread > 0 && <span className="ml-1.5"><Badge tone="yellow">{unread}</Badge></span>}
              </Button>
            </div>
          </div>
        }
      />

      <CardBody className="!px-4 !pt-0 sm:!px-6">
        {err ? <div className="text-sm text-red-600 mb-4">{err}</div> : null}

        {loading ? (
          <div className="mt-6"><Loader /></div>
        ) : (
          <>
            {/* ── Row 1: KPI cards ── */}
            {/* Revenue gets brand treatment as the hero metric */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              <StatCard
                title="Revenue"
                value={formatMoney(summary?.revenue)}
                hint={`Last ${days} days`}
                tone="brand"
              />
              <StatCard title="Sales" value={summary?.sales_count ?? 0} tone="neutral" />
              <StatCard title="Avg sale" value={formatMoney(summary?.avg_sale)} tone="neutral" />
              <StatCard
                title="Low stock"
                value={summary?.low_stock_count ?? 0}
                hint="Needs reorder"
                tone="amber"
                onClick={() => nav("/app/owner/inventory?filter=low")}
              />
              <StatCard
                title="Out of stock"
                value={summary?.out_of_stock_count ?? 0}
                tone="red"
                onClick={() => nav("/app/owner/inventory?filter=out")}
              />
            </div>

            {/* ── Row 2: Revenue trend (hero chart) + Top products ── */}
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4">

              {/* Line chart — revenue over time */}
              <div className="rounded-2xl border border-stone-200/70 bg-white p-4 sm:p-5">
                <SectionHeader
                  title="Revenue trend"
                  action={<span className="text-xs text-stone-400">Last {days} days · daily revenue</span>}
                />
                <div className="mt-4">
                  <RevenueBarChart data={trendData} height={300} />
                </div>
              </div>

              {/* Top products */}
              <div className="rounded-2xl border border-stone-200/70 bg-white p-4 sm:p-5">
                <SectionHeader
                  title="Top products"
                  action={
                    <Button variant="ghost" onClick={() => nav("/app/owner/catalog/products")}>
                      Manage
                    </Button>
                  }
                />
                <div className="mt-3 space-y-2.5">
                  {top.length ? top.map((p, i) => (
                    <div key={p.product_id} className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 min-w-0">
                        {/* Rank number */}
                        <span className="text-xs font-bold text-stone-300 w-4 flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#1B2A4A] truncate">{p.name}</div>
                          <div className="text-xs text-stone-400 truncate">{p.sku}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-[#1B2A4A] tabular-nums">{p.qty} sold</div>
                        <div className="text-xs text-stone-400 tabular-nums">{formatMoney(p.revenue)}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-stone-400 mt-2">No sales data yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 3: Quick actions ── */}
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                <div className="font-semibold text-[#1B2A4A]">Quick actions</div>
                <div className="text-xs text-stone-400 uppercase tracking-wide">Jump to key workflows</div>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <QuickAction title="Supply stock" subtitle="Record deliveries." icon={<IconSupply />} onClick={() => nav("/app/owner/inventory/ops")} />
                <QuickAction title="Create product" subtitle="Add SKU, price, category." icon={<IconProduct />} onClick={() => nav("/app/owner/catalog/products/new")} />
                <QuickAction title="View inventory" subtitle="Quantities and low stock." icon={<IconInventory />} onClick={() => nav("/app/owner/inventory")} />
                <QuickAction title="Sales & receipts" subtitle="Browse, view, void." icon={<IconSales />} onClick={() => nav("/app/sales")} />
              </div>
            </div>

            {/* ── Row 4: Inventory health + Recent activity ── */}
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Inventory health — donut moved here as supporting chart */}
              <div className="rounded-2xl border border-stone-200/70 bg-white p-4 sm:p-5">
                <SectionHeader
                  title="Inventory health"
                  action={<Button variant="ghost" onClick={() => nav("/app/owner/inventory")}>Open</Button>}
                />

                {/* Mini stats */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <div className="text-xs text-stone-400">Total SKUs</div>
                    <div className="font-bold text-[#1B2A4A] tabular-nums">{health?.total_skus ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <div className="text-xs text-stone-400">Total units</div>
                    <div className="font-bold text-[#1B2A4A] tabular-nums">{health?.total_units ?? 0}</div>
                  </div>
                </div>

                {/* Donut — supporting visual */}
                <div className="mt-4">
                  <DonutChart segments={inventorySegments} centerLabel="SKUs" />
                </div>

                {/* Low stock items */}
                {health?.low_stock_items?.length ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                      Low stock (top 6)
                    </div>
                    <div className="space-y-1.5">
                      {(health.low_stock_items).slice(0, 6).map((x) => (
                        <button
                          key={x.product_id}
                          type="button"
                          onClick={() => nav(`/app/owner/catalog/products/${x.product_id}/edit`)}
                          className="w-full flex items-center justify-between gap-2 rounded-xl bg-stone-50 hover:bg-amber-50 transition p-2.5 text-sm min-w-0"
                        >
                          <span className="text-stone-700 truncate min-w-0 text-xs">
                            {x.name} <span className="text-stone-400">({x.sku})</span>
                          </span>
                          <Badge tone="yellow">{x.quantity}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-stone-400">All items well-stocked.</div>
                )}
              </div>

              {/* Recent activity */}
              <div className="rounded-2xl border border-stone-200/70 bg-white p-4 sm:p-5">
                <SectionHeader
                  title="Recent activity"
                  action={<Button variant="ghost" onClick={() => nav("/app/notifications")}>Alerts</Button>}
                />

                {/* Stock movements */}
                <div className="mt-3">
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                    Stock movements
                  </div>
                  <div className="space-y-1.5">
                    {(recent?.stock_movements || []).slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl bg-stone-50 p-2.5 text-xs min-w-0">
                        <div className="min-w-0">
                          <span className="font-medium text-[#1B2A4A] truncate block">{m.product_name}</span>
                          <span className="text-stone-400 truncate block">{m.sku} · {m.movement_type} {m.direction}</span>
                        </div>
                        <Badge tone={m.direction === "IN" ? "green" : "yellow"}>{m.quantity}</Badge>
                      </div>
                    ))}
                    {!recent?.stock_movements?.length && (
                      <div className="text-xs text-stone-400">No movements yet.</div>
                    )}
                  </div>
                </div>

                {/* Notifications */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                    Notifications
                  </div>
                  <div className="space-y-1.5">
                    {(recent?.notifications || []).slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => nav("/app/notifications")}
                        className="w-full text-left rounded-xl bg-stone-50 hover:bg-stone-100 transition p-2.5 text-xs min-w-0"
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <span className="text-stone-600 break-words min-w-0">{n.message}</span>
                          <Badge tone={n.is_read ? "gray" : "blue"} className="flex-shrink-0">
                            {n.is_read ? "Read" : "New"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {!recent?.notifications?.length && (
                      <div className="text-xs text-stone-400">No notifications yet.</div>
                    )}
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