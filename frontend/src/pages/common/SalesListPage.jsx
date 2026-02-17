import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { salesApi } from "../../api/sales";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

export default function SalesListPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await salesApi.list({
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load sales.");
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader
        title="Sales"
        subtitle="View completed/voided sales."
        right={
          <Button variant="secondary" onClick={load}>Refresh</Button>
        }
      />

      <CardBody className="!px-4 !pt-0 sm:!px-6">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="VOIDED">VOIDED</option>
          </Select>
          <Input label="Date from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="Date to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="flex items-end col-span-2 sm:col-span-1">
            <Button className="w-full" onClick={load}>Apply</Button>
          </div>
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-8 text-sm text-gray-500">No sales found.</div>
        ) : (
          <>
            {/* ── Desktop table — hidden on mobile ── */}
            <div className="hidden sm:block mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-3 pr-4">When</th>
                    <th className="py-3 pr-4">ID</th>
                    <th className="py-3 pr-4">Sale</th>
                    <th className="py-3 pr-4">Payment</th>
                    <th className="py-3 pr-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    // FIX: entire row is clickable — no View button needed
                    <tr
                      key={s.id}
                      onClick={() => nav(`/app/sales/${s.id}`)}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 font-medium">#{s.id}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone={s.status === "VOIDED" ? "red" : "green"}>{s.status}</Badge>
                          <Badge tone={s.payment_status === "PAID" ? "green" : s.payment_status === "PARTIAL" ? "yellow" : "red"}>
                            {s.payment_status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {s.payment_type}
                          {s.payment_type === "CREDIT" ? <> · Due: {s.due_date || s.invoice?.due_date || "—"}</> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {s.payment_method || "—"}
                        {s.payment_type === "CREDIT" ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Paid: {s.amount_paid} · Bal: {s.balance_due}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 font-semibold">{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card rows — hidden on desktop ── */}
            <div className="sm:hidden mt-4 space-y-2">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => nav(`/app/sales/${s.id}`)}
                  className="w-full text-left rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:bg-gray-100 transition p-4 space-y-2"
                >
                  {/* Row 1: ID + total */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">Sale #{s.id}</span>
                    <span className="font-bold text-gray-900">{s.total}</span>
                  </div>

                  {/* Row 2: badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={s.status === "VOIDED" ? "red" : "green"}>{s.status}</Badge>
                    <Badge tone={s.payment_status === "PAID" ? "green" : s.payment_status === "PARTIAL" ? "yellow" : "red"}>
                      {s.payment_status}
                    </Badge>
                    {s.payment_method ? (
                      <span className="text-xs text-gray-500">{s.payment_method}</span>
                    ) : null}
                  </div>

                  {/* Row 3: credit details (if any) */}
                  {s.payment_type === "CREDIT" ? (
                    <div className="text-xs text-gray-500">
                      Due: {s.due_date || s.invoice?.due_date || "—"} · Paid: {s.amount_paid} · Bal: {s.balance_due}
                    </div>
                  ) : null}

                  {/* Row 4: timestamp */}
                  <div className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}