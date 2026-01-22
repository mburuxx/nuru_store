import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { notificationsApi } from "../../api/notifications";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

function toneForType(t) {
  if (t === "LOW_STOCK") return "red";
  if (t === "SALE_VOIDED") return "yellow";
  return "blue"; // SALE_MADE
}

export default function NotificationsPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  const unreadOnly = sp.get("unread") === "1";
  const type = sp.get("type") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const [openId, setOpenId] = useState(null);
  const openItem = useMemo(() => items.find((x) => x.id === openId) || null, [items, openId]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const params = {
        unread: unreadOnly ? "1" : undefined,
        type: type || undefined,
      };
      const res = await notificationsApi.list(params);
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function openNotification(n) {
    setOpenId(n.id);

    // ✅ Auto-mark read the moment it’s opened (only if currently unread)
    if (!n.is_read) {
      try {
        await notificationsApi.markRead(n.id, true);

        // update local UI instantly (no waiting for reload)
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch {
        // if it fails, user can still manually mark later; don’t block opening
      }
    }
  }

  function closeDrawer() {
    setOpenId(null);
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch {
      setErr("Failed to mark all as read.");
    }
  }

  function setFilter(next) {
    const params = new URLSearchParams(sp);
    if (next.unread === true) params.set("unread", "1");
    else params.delete("unread");

    if (next.type) params.set("type", next.type);
    else params.delete("type");

    setSp(params);
  }

  function jumpFromNotification(n) {
    // Optional smart navigation
    if (n.sale_id) return nav(`/app/sales/${n.sale_id}`);
    if (n.product_id) return nav(`/app/owner/catalog/products/${n.product_id}/edit`);
  }

  return (
    <Card>
      <CardHeader
        title="Notifications"
        subtitle="Alerts and activity updates."
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
            <Button variant="ghost" onClick={markAllRead}>Mark all read</Button>
          </div>
        }
      />

      <CardBody>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={!unreadOnly && !type ? "secondary" : "ghost"}
            onClick={() => setFilter({ unread: false, type: "" })}
          >
            All
          </Button>
          <Button
            variant={unreadOnly ? "secondary" : "ghost"}
            onClick={() => setFilter({ unread: !unreadOnly, type })}
          >
            Unread
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {["SALE_MADE", "LOW_STOCK", "SALE_VOIDED"].map((t) => (
            <Button
              key={t}
              variant={type === t ? "secondary" : "ghost"}
              onClick={() => setFilter({ unread: unreadOnly, type: type === t ? "" : t })}
            >
              {t.replaceAll("_", " ")}
            </Button>
          ))}
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No notifications" subtitle="You’re all caught up." />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* list */}
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`w-full text-left p-4 border-b last:border-b-0 hover:bg-gray-50 transition ${
                    openId === n.id ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={toneForType(n.type)}>{n.type.replaceAll("_", " ")}</Badge>
                        {!n.is_read ? <Badge tone="blue">NEW</Badge> : <Badge tone="gray">Read</Badge>}
                      </div>
                      <div className="mt-2 font-semibold text-gray-900">{n.message}</div>
                      <div className="mt-1 text-xs text-gray-500">{fmt(n.created_at)}</div>
                    </div>
                    <div className="text-xs text-gray-400">#{n.id}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* details drawer */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 h-fit">
              {!openItem ? (
                <div className="text-sm text-gray-600">Select a notification to view details.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">Details</div>
                    <Button variant="ghost" onClick={closeDrawer}>Close</Button>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Type</span>
                      <Badge tone={toneForType(openItem.type)}>{openItem.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status</span>
                      <Badge tone={openItem.is_read ? "gray" : "blue"}>
                        {openItem.is_read ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <div className="pt-2 text-gray-900 font-semibold">{openItem.message}</div>
                    <div className="text-xs text-gray-500">{fmt(openItem.created_at)}</div>
                  </div>

                  {(openItem.sale_id || openItem.product_id) ? (
                    <Button className="w-full mt-5" onClick={() => jumpFromNotification(openItem)}>
                      Open related record
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}