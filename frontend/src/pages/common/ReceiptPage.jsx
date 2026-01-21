import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { salesApi } from "../../api/sales";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function ReceiptPage() {
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
        setErr("Failed to load receipt.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader />;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!sale) return null;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex gap-2 mb-4 print:hidden">
        <Button variant="secondary" onClick={() => nav(-1)}>Back</Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:shadow-none print:border-0">
        <div className="text-center">
          <div className="text-lg font-semibold">Nuru Store</div>
          <div className="text-xs text-gray-500">Receipt</div>

          <div className="mt-2 text-sm">
            <div className="font-medium">{sale.receipt?.receipt_number || "—"}</div>
            <div className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Sale ID</span>
            <span className="font-medium">#{sale.id}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Payment</span>
            <span className="font-medium">{sale.payment_method}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-600">Status</span>
            <span className="font-medium">{sale.status}</span>
          </div>
        </div>

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
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Thank you!
        </div>
      </div>
    </div>
  );
}