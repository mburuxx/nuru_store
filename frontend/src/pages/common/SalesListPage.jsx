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
        right={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl">
          <Select label="Status" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="VOIDED">VOIDED</option>
          </Select>
          <Input label="Date from" type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
          <Input label="Date to" type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
          <div className="flex items-end">
            <Button className="w-full" onClick={load}>Apply</Button>
          </div>
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}
        {loading ? <div className="mt-4"><Loader /></div> : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-3">When</th>
                  <th className="py-3">ID</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Payment</th>
                  <th className="py-3">Total</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-600">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="py-3 font-medium">#{s.id}</td>
                    <td className="py-3">
                      <Badge tone={s.status === "VOIDED" ? "red" : "green"}>{s.status}</Badge>
                    </td>
                    <td className="py-3">{s.payment_method}</td>
                    <td className="py-3">{s.total}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" onClick={() => nav(`/app/sales/${s.id}`)}>View</Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-gray-500">No sales found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}