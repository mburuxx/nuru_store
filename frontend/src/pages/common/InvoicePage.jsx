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

  if (loading) return <Loader />;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!sale) return null;

  const inv = sale.invoice;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex gap-2 mb-4 print:hidden">
        <Button variant="secondary" onClick={() => nav(-1)}>Back</Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:shadow-none print:border-0">
        <div className="text-center">
          <div className="text-lg font-semibold">Nuru Store</div>
          <div className="text-xs text-gray-500">Invoice</div>

          <div className="mt-2 text-sm">
            <div className="font-medium">{inv?.invoice_number || "—"}</div>
            <div className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Sale ID</span>
            <span className="font-medium">#{sale.id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Invoice status</span>
            <span className="font-medium">{inv?.status || "—"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Due date</span>
            <span className="font-medium">{inv?.due_date || sale.due_date || "—"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Payment status</span>
            <span className="font-medium">{sale.payment_status}</span>
          </div>
        </div>

        {(sale.customer_name || sale.customer_phone) ? (
          <div className="mt-4 border-t border-gray-100 pt-4 text-sm space-y-1">
            <div className="font-medium text-gray-900">Customer</div>
            {sale.customer_name ? <div className="text-gray-700">{sale.customer_name}</div> : null}
            {sale.customer_phone ? <div className="text-gray-700">{sale.customer_phone}</div> : null}
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
                    <div className="text-xs text-gray-500">{it.sku} • {it.unit_price_snapshot}</div>
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{it.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Total</span>
            <span className="font-semibold">{sale.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount paid</span>
            <span className="font-semibold">{sale.amount_paid}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-semibold">Balance</span>
            <span className="font-semibold">
              {(Number(sale.total) - Number(sale.amount_paid)).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500 text-center">
          You were served by{" "}
          <span className="font-medium text-gray-700">{sale.cashier_username || "—"}</span>
        </div>
      </div>
    </div>
  );
}