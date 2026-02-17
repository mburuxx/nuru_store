// src/pages/cashier/CashierDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Loader from "../../components/ui/Loader";

const BRAND = "#1B2A4A";

function formatMoney(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return String(v ?? "0");
  return n.toFixed(2);
}

function StatCard({ title, value, hint, tone = "neutral" }) {
  const tones = {
    brand:   "bg-[#1B2A4A] border-[#1B2A4A]",
    neutral: "bg-stone-50 border-stone-200",
  };
  const valueColor = tone === "brand" ? "text-white" : "text-[#1B2A4A]";
  const labelColor = tone === "brand" ? "text-white/70" : "text-stone-500";
  const hintColor  = tone === "brand" ? "text-white/60" : "text-stone-400";
  return (
    <div className={`rounded-2xl border p-4 min-w-0 ${tones[tone] || tones.neutral}`}>
      <div className={`text-xs font-medium truncate uppercase tracking-wide ${labelColor}`}>{title}</div>
      <div className={`mt-1.5 text-2xl font-bold break-words tabular-nums ${valueColor}`}>{value}</div>
      {hint ? <div className={`mt-0.5 text-xs truncate ${hintColor}`}>{hint}</div> : null}
    </div>
  );
}

function useResizeWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
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
  const s = String(label ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(5); // MM-DD
  return s.length > 10 ? s.slice(0, 10) + "…" : s;
}

export function BarChart({ data = [], height = 120 }) {
  const gradientId = useId();
  const [wrapRef, width] = useResizeWidth();
  const [hover, setHover] = useState(null);

  // Always compute PAD/W/H (even if width=0) so hooks can run safely
  const PAD = { top: 12, right: 16, bottom: 34, left: 52 };
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = Math.max(0, height - PAD.top - PAD.bottom);

  // ✅ Hook is NOT conditional anymore
  const parsed = useMemo(() => {
    if (!data.length || !innerW || !innerH) {
      return { bars: [], yTicks: [], xLabelIdxs: [] };
    }

    const values = data.map((d) => Number(d.revenue ?? d.total ?? d.value ?? 0));
    const labels = data.map((d) => d.date ?? d.label ?? "");
    const maxRaw = Math.max(...values, 1);
    const maxV = niceMax(maxRaw);

    const tickFracs = [0, 0.25, 0.5, 0.75, 1];
    const yTicks = tickFracs.map((f) => ({
      y: PAD.top + innerH - f * innerH,
      label: formatCompact(f * maxV),
      isBase: f === 0,
    }));

    const n = Math.max(1, data.length);
    const slot = innerW / n;
    const barW = Math.min(24, Math.max(6, slot * 0.62));
    const x0 = PAD.left;

    const bars = values.map((v, i) => {
      const barH = (v / maxV) * innerH;
      const cx = x0 + i * slot + slot / 2;
      const x = cx - barW / 2;
      const y = PAD.top + innerH - barH;

      return {
        i,
        x,
        y,
        w: barW,
        h: Math.max(2, barH),
        cx,
        value: v,
        label: labels[i],
      };
    });

    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    const xLabelIdxs = Array.from({ length: n }, (_, i) => i).filter(
      (i) => i === 0 || i === n - 1 || i % step === 0
    );

    return { bars, yTicks, xLabelIdxs };
  }, [data, innerW, innerH]); // keep deps simple & correct

  // Now early returns are fine because hooks already ran
  if (!data.length) {
    return (
      <div ref={wrapRef} className="flex items-center justify-center h-28 text-sm text-stone-400">
        No sales data yet for this period.
      </div>
    );
  }

  if (!width) return <div ref={wrapRef} style={{ height }} className="w-full" />;

  const onMove = (e) => {
    if (!parsed.bars.length) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    let best = null;
    let bestDist = Infinity;
    for (const b of parsed.bars) {
      const dist = Math.abs(mx - b.cx);
      if (dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }

    const inPlot = mx >= PAD.left && mx <= width - PAD.right;
    setHover(inPlot ? best : null);
  };

  return (
    <div ref={wrapRef} className="w-full">
      <svg
        width={width}
        height={height}
        className="block w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Sales trend chart"
      >
        <defs>
          <linearGradient id={`cashierBarGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity="0.95" />
            <stop offset="100%" stopColor={BRAND} stopOpacity="0.35" />
          </linearGradient>
          <filter id={`softShadow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* grid + y labels */}
        {parsed.yTicks.map((t, i) => (
          <g key={i}>
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
                fill={`url(#cashierBarGrad-${gradientId})`}
                opacity={hover ? (active ? 1 : 0.45) : 1}
                filter={active ? `url(#softShadow-${gradientId})` : "none"}
              />
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
            {(() => {
              const tipW = 150;
              const tipH = 44;
              const x = Math.min(width - PAD.right - tipW, Math.max(PAD.left, hover.cx - tipW / 2));
              const y = PAD.top + 6;

              return (
                <g>
                  <rect x={x} y={y} width={tipW} height={tipH} rx="10" fill="white" stroke="#eee" />
                  <text x={x + 12} y={y + 18} fontSize="10" fill="#78716c" fontFamily="system-ui, sans-serif">
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


function SectionHeader({ title, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="font-semibold text-[#1B2A4A]">{title}</div>
      {action}
    </div>
  );
}

const IconPOS = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M2 9h20" stroke="currentColor" strokeWidth="1.8" />
    <path d="M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2M15 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconCatalog = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M19.5 19.5L22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconScan = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function QuickAction({ title, subtitle, icon, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-left rounded-2xl border border-stone-200/70 bg-white hover:bg-stone-50 hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0 transition-all duration-150 p-4 w-full min-w-0">
      {icon ? <div className="mb-2 text-amber-500">{icon}</div> : null}
      <div className="font-semibold text-[#1B2A4A] truncate text-sm">{title}</div>
      <div className="text-xs text-stone-500 mt-0.5 break-words">{subtitle}</div>
      <div className="text-xs font-semibold text-amber-600 mt-2">Open →</div>
    </button>
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

  useEffect(() => { load(); }, [load]);

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
        subtitle="Your sales overview."
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
              <Button onClick={() => nav("/app/cashier/pos")}>Open POS</Button>
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
            {/* Row 1: KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard title="Revenue" value={formatMoney(summary?.revenue)} hint={`Last ${days} days`} tone="brand" />
              <StatCard title="Sales" value={summary?.sales_count ?? 0} tone="neutral" />
              <StatCard title="Avg sale" value={formatMoney(summary?.avg_sale)} tone="neutral" />
            </div>

            {/* Row 2: Bar chart + Recent sales */}
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4">
              <div className="rounded-2xl border border-stone-200/70 bg-white p-4 sm:p-5">
                <SectionHeader
                  title="Your sales trend"
                  action={<span className="text-xs text-stone-400">Last {days} days · daily</span>}
                />
                <div className="mt-4">
                  <BarChart data={trendData} height={300} />
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/70 bg-white p-4 sm:p-5">
                <SectionHeader
                  title="Recent sales"
                  action={<Button variant="ghost" onClick={() => nav("/app/sales")}>View all</Button>}
                />
                <div className="mt-3 space-y-1.5">
                  {recent.length ? recent.map((s) => (
                    <button key={s.id} type="button" onClick={() => nav(`/app/sales/${s.id}`)}
                      className="w-full text-left rounded-xl bg-stone-50 hover:bg-stone-100 transition p-3 text-sm flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-medium text-[#1B2A4A] truncate block">Sale #{s.id}</span>
                        <span className="text-xs text-stone-400 truncate block">{s.payment_method}</span>
                      </div>
                      <span className="font-bold text-[#1B2A4A] flex-shrink-0 tabular-nums">
                        {formatMoney(s.total)}
                      </span>
                    </button>
                  )) : (
                    <div className="text-sm text-stone-400 mt-2">No recent sales.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Quick actions */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <QuickAction title="Make a sale" subtitle="Open POS and checkout." icon={<IconPOS />} onClick={() => nav("/app/cashier/pos")} />
              <QuickAction title="Browse catalog" subtitle="Search products and stock." icon={<IconCatalog />} onClick={() => nav("/app/cashier/catalog")} />
              <QuickAction title="Scan SKU" subtitle="Fast lookup by barcode." icon={<IconScan />} onClick={() => nav("/app/cashier/scan")} />
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}