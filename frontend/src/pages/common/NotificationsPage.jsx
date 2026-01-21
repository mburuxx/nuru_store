import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../../api/notifications";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Select from "../../components/ui/Select";
import Loader from "../../components/ui/Loader";

function TypeBadge({ type }) {
  const map = {
    SALE_MADE: { tone: "green", label: "Sale made" },
    LOW_STOCK: { tone: "red", label: "Low stock" },
    SALE_VOIDED: { tone: "yellow", label: "Sale voided" },
  };
  const t = map[type] || { tone: "blue", label: type };
  return <Badge tone={t.tone}>{t.label}</Badge>;
}

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "—";
  }
}

export default function NotificationsPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState("");

  const params = useMemo(() => {
    const p = {};
    if (unreadOnly) p.unread = 1;
    if (type) p.type = type;
    return p;
  }, [unreadOnly, type]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await notificationsApi.list(params);
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  async function markOne(id, is_read) {
    setBusyId(id);
    setErr("");
    try {
      await notificationsApi.markRead(id, is_read);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read } : n)));
    } catch {
      setErr("Failed to update notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAll() {
    setErr("");
    setLoading(true);
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setErr("Failed to mark all as read.");
    } finally {
      setLoading(false);
    }
  }

  function openLinked(n) {
    // Optional convenience navigation
    if (n.sale_id) return nav(`/app/sales/${n.sale_id}`);
    if (n.product_id) return nav(`/app/owner/catalog/products/${n.product_id}/edit`);
  }

  return (
    <Card>
      <CardHeader
        title="Notifications"
        subtitle="Sales, low stock, and important activity."
        right={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={markAll} disabled={loading || items.every((x) => x.is_read)}>
              Mark all read
            </Button>
          </div>
        }
      />

      <CardBody>
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setUnreadOnly((s) => !s)}
              className={`rounded-xl px-3 py-2 text-sm font-medium border transition ${
                unreadOnly ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Unread only
            </button>
          </div>

          <div className="w-full md:max-w-xs">
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              <option value="SALE_MADE">Sale made</option>
              <option value="LOW_STOCK">Low stock</option>
              <option value="SALE_VOIDED">Sale voided</option>
            </Select>
          </div>
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4">
            <Loader />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 text-sm text-gray-600">No notifications.</div>
        ) : (
          <div className="mt-6 space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                  n.is_read ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={n.type} />
                    {!n.is_read ? <Badge tone="blue">Unread</Badge> : null}
                    <span className="text-xs text-gray-500">{timeAgo(n.created_at)}</span>
                  </div>

                  <div className="mt-2 font-medium text-gray-900">{n.message}</div>

                  <div className="mt-1 text-xs text-gray-500 flex gap-3 flex-wrap">
                    {n.sale_id ? <span>Sale #{n.sale_id}</span> : null}
                    {n.product_id ? <span>Product #{n.product_id}</span> : null}
                  </div>
                </div>

                <div className="flex gap-2">
                  {(n.sale_id || n.product_id) ? (
                    <Button variant="secondary" onClick={() => openLinked(n)}>
                      Open
                    </Button>
                  ) : null}

                  <Button
                    variant="ghost"
                    disabled={busyId === n.id}
                    onClick={() => markOne(n.id, !n.is_read)}
                  >
                    {busyId === n.id ? "..." : n.is_read ? "Mark unread" : "Mark read"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}