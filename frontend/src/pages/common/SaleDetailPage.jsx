// pages/common/SaleDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { salesApi } from "../../api/sales";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";

export default function SaleDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.is_superuser || user?.role === "OWNER";

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [notes, setNotes] = useState("");
  const [voiding, setVoiding] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await salesApi.detail(id);
      setSale(res.data);
    } catch {
      setErr("Failed to load sale.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    document.title = `Sale #${id} • NURU STORES`;
  }, [id]);

  async function onVoid() {
    if (!isOwner) return;
    setErr("");
    setVoiding(true);
    try {
      const res = await salesApi.voidSale(id, { notes });
      setSale(res.data);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Void failed.");
    } finally {
      setVoiding(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title={`Sale #${id}`} subtitle="Loading..." />
        <CardBody>
          <Loader />
        </CardBody>
      </Card>
    );
  }

  if (err) {
    return (
      <Card>
        <CardHeader title={`Sale #${id}`} subtitle="Sale details" />
        <CardBody>
          <div className="text-sm text-red-600">{err}</div>
        </CardBody>
      </Card>
    );
  }

  if (!sale) return null;

  const showDocButton = sale?.invoice ? (
    <Button variant="secondary" onClick={() => nav(`/app/sales/${sale.id}/invoice`)}>
      Invoice
    </Button>
  ) : sale?.receipt ? (
    <Button variant="secondary" onClick={() => nav(`/app/sales/${sale.id}/receipt`)}>
      Receipt
    </Button>
  ) : null;

  return (
    <Card>
      <CardHeader
        title={`Sale #${id}`}
        subtitle={
          sale?.invoice?.invoice_number
            ? `Invoice: ${sale.invoice.invoice_number}`
            : sale?.receipt?.receipt_number
            ? `Receipt: ${sale.receipt.receipt_number}`
            : "Sale details"
        }
        right={
          <div className="flex items-center gap-2">
            {showDocButton}
            <Badge tone={sale.status === "VOIDED" ? "red" : "green"}>{sale.status}</Badge>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Payment type</div>
            <div className="font-semibold">{sale.payment_type}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Payment status</div>
            <div className="font-semibold">{sale.payment_status}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Payment method</div>
            <div className="font-semibold">{sale.payment_method || "—"}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Subtotal</div>
            <div className="font-semibold">{sale.subtotal}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Total</div>
            <div className="font-semibold">{sale.total}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Amount paid</div>
            <div className="font-semibold">{sale.amount_paid}</div>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Balance due</div>
            <div className="font-semibold">{sale.balance_due}</div>
          </div>

          {sale.payment_type === "CREDIT" ? (
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Due date</div>
              <div className="font-semibold">{sale.due_date || sale.invoice?.due_date || "—"}</div>
            </div>
          ) : null}

          {sale.invoice ? (
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Invoice status</div>
              <div className="font-semibold">{sale.invoice.status}</div>
            </div>
          ) : null}
        </div>

        {(sale.customer_name || sale.customer_phone) ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="font-semibold text-gray-900">Customer</div>
            <div className="mt-2 text-sm text-gray-700">
              <div><span className="text-gray-500">Name:</span> {sale.customer_name || "—"}</div>
              <div><span className="text-gray-500">Phone:</span> {sale.customer_phone || "—"}</div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-3">Item</th>
                <th className="py-3">SKU</th>
                <th className="py-3">Qty</th>
                <th className="py-3">Unit</th>
                <th className="py-3">Line</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="py-3 font-medium">{it.product_name}</td>
                  <td className="py-3 text-gray-600">{it.sku}</td>
                  <td className="py-3">{it.quantity}</td>
                  <td className="py-3">{it.unit_price_snapshot}</td>
                  <td className="py-3">{it.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sale.payments?.length ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="font-semibold text-gray-900">Payments</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-2">When</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Ref</th>
                    <th className="py-2">By</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="py-2 text-gray-600">{new Date(p.received_at).toLocaleString()}</td>
                      <td className="py-2">{p.method}</td>
                      <td className="py-2">{p.amount}</td>
                      <td className="py-2 text-gray-600">{p.reference || "—"}</td>
                      <td className="py-2 text-gray-600">{p.received_by_username || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isOwner && sale.status !== "VOIDED" ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="font-semibold text-gray-900">Void sale (Owner)</div>
            <div className="text-sm text-gray-500 mt-1">This will restore stock via VOID movements.</div>
            <div className="mt-3 max-w-xl">
              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="mt-4">
              <Button variant="danger" disabled={voiding} onClick={onVoid}>
                {voiding ? "Voiding..." : "Void Sale"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}