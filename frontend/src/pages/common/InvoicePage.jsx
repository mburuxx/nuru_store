import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { salesApi } from "../../api/sales";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function InvoicePage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const res = await salesApi.detail(id);
        setSale(res.data);
      } catch {
        setErr("Failed to load invoice.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    document.title = `Invoice • Sale #${id} • NURU STORES`;
  }, [id]);

  if (loading) return <Loader />;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!sale) return null;

  const invoiceNumber = sale.invoice?.invoice_number || "—";
  const invoiceStatus = sale.invoice?.status || "—";
  const issuedAt = sale.invoice?.issued_at ? new Date(sale.invoice.issued_at).toLocaleString() : null;
  const dueDate = sale.due_date || sale.invoice?.due_date || "—";

  const amountPaid = sale.amount_paid ?? "0.00";
  const balanceDue = sale.balance_due ?? "0.00";

  return (
    <div className="mx-auto max-w-md">
      {/* PRINT FIX: only print the .printable-area */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .printable-area, .printable-area * { visibility: visible !important; }
          .printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="flex gap-2 mb-4 print:hidden">
        <Button variant="secondary" onClick={() => nav(-1)}>Back</Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <div className="printable-area bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:shadow-none print:border-0">
        <div className="text-center">
          <div className="text-lg font-semibold">Nuru Store</div>
          <div className="text-xs text-gray-500">Invoice</div>

          <div className="mt-2 text-sm">
            <div className="font-medium">{invoiceNumber}</div>
            <div className="text-xs text-gray-500">
              {issuedAt || new Date(sale.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sale ID</span>
            <span className="font-medium">#{sale.id}</span>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Invoice status</span>
            <span className="font-medium">{invoiceStatus}</span>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Payment type</span>
            <span className="font-medium">{sale.payment_type}</span>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Payment status</span>
            <span className="font-medium">{sale.payment_status}</span>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Due date</span>
            <span className="font-medium">{dueDate}</span>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Payment method</span>
            <span className="font-medium">{sale.payment_method || "—"}</span>
          </div>
        </div>

        {sale.customer_name || sale.customer_phone ? (
          <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
            <div className="font-semibold text-gray-900 mb-2">Customer</div>

            <div className="flex justify-between">
              <span className="text-gray-600">Name</span>
              <span className="font-medium">{sale.customer_name || "—"}</span>
            </div>

            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium">{sale.customer_phone || "—"}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-4 border-t border-gray-100 pt-4">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.id} className="border-t border-gray-50">
                  <td className="py-2">
                    <div className="font-medium">{it.product_name}</div>
                    <div className="text-xs text-gray-500">
                      {it.sku} • {it.unit_price_snapshot}
                    </div>
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{it.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{sale.subtotal}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Discount</span>
            <span className="font-semibold">{sale.discount}</span>
          </div>
          <div className="flex justify-between mt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{sale.total}</span>
          </div>

          <div className="mt-3 border-t border-gray-50 pt-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount paid</span>
              <span className="font-semibold">{amountPaid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Balance due</span>
              <span className="font-semibold">{balanceDue}</span>
            </div>
          </div>
        </div>

        {sale.payments?.length ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="font-semibold text-gray-900 text-sm mb-2">Payments</div>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2">When</th>
                  <th className="py-2">Method</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="py-2 text-gray-600">{new Date(p.received_at).toLocaleString()}</td>
                    <td className="py-2">{p.method}</td>
                    <td className="py-2 text-right">{p.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500 text-center">
          You were served by{" "}
          <span className="font-medium text-gray-700">{sale.cashier_username || "—"}</span>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Please pay the balance on or before the due date.
        </div>
      </div>
    </div>
  );
}