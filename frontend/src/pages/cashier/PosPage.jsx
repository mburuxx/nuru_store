// pages/cashier/PosPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi } from "../../api/catalog";
import { salesApi } from "../../api/sales";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

export default function PosPage() {
  const nav = useNavigate();

  const [sku, setSku] = useState("");
  const [cart, setCart] = useState([]);

  const [paymentType, setPaymentType] = useState("PAY_NOW");
  const [payment_method, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const [qtyDraft, setQtyDraft] = useState({});

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, row) => sum + Number(row.product.selling_price) * row.quantity, 0);
  }, [cart]);

  async function addSku(e) {
    e.preventDefault();
    setErr("");
    setOk(null);
    const s = sku.trim();
    if (!s) return;
    setBusy(true);
    try {
      const res = await catalogApi.getBySku(s);
      addToCart(res.data);
      setSku("");
    } catch {
      setErr("SKU not found or inactive.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = search.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await catalogApi.listProducts({ search: q, ordering: "name" });
        const rows = res.data?.results || res.data || [];
        setResults(rows.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function addToCart(p) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        setQtyDraft((d) => ({ ...d, [p.id]: String(copy[idx].quantity) }));
        return copy;
      }
      setQtyDraft((d) => ({ ...d, [p.id]: "1" }));
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((row) => row.product.id !== productId));
    setQtyDraft((d) => { const copy = { ...d }; delete copy[productId]; return copy; });
  }

  function onQtyChange(productId, raw) {
    if (raw === "" || /^[0-9]+$/.test(raw)) {
      setQtyDraft((d) => ({ ...d, [productId]: raw }));
    }
  }

  function commitQty(productId) {
    const raw = qtyDraft[productId];
    if (raw === "" || raw == null) {
      const existing = cart.find((r) => r.product.id === productId)?.quantity ?? 1;
      setQtyDraft((d) => ({ ...d, [productId]: String(existing) }));
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    if (n === 0) { removeFromCart(productId); return; }
    const finalQty = Math.max(1, n);
    setCart((prev) =>
      prev.map((row) => (row.product.id === productId ? { ...row, quantity: finalQty } : row))
    );
    setQtyDraft((d) => ({ ...d, [productId]: String(finalQty) }));
  }

  function resetCreditFields() {
    setAmountPaid("");
    setDueDate("");
    setCustomerName("");
    setCustomerPhone("");
  }

  async function checkout() {
    setErr("");
    setOk(null);
    if (cart.length === 0) { setErr("Cart is empty."); return; }
    if (paymentType === "CREDIT" && !dueDate) { setErr("Due date is required for credit sales."); return; }

    let parsedAmountPaid = 0;
    if (paymentType === "CREDIT") {
      if (amountPaid === "") parsedAmountPaid = 0;
      else {
        const n = Number(amountPaid);
        if (Number.isNaN(n) || n < 0) { setErr("Amount paid now must be a valid number (0 or more)."); return; }
        parsedAmountPaid = n;
      }
    }

    const methodToSend =
      paymentType === "PAY_NOW" ? payment_method
      : parsedAmountPaid > 0 ? payment_method
      : null;

    setBusy(true);
    try {
      const payload = {
        payment_type: paymentType,
        payment_method: methodToSend,
        ...(paymentType === "CREDIT"
          ? { amount_paid: parsedAmountPaid, due_date: dueDate, customer_name: customerName, customer_phone: customerPhone }
          : {}),
        items: cart.map((row) => ({ product_id: row.product.id, quantity: row.quantity })),
      };
      const res = await salesApi.create(payload);
      setOk(res.data);
      setCart([]);
      setQtyDraft({});
      if (paymentType === "CREDIT") resetCreditFields();
    } catch (e2) {
      const data = e2?.response?.data;
      setErr(
        data?.detail || data?.due_date?.[0] || data?.payment_method?.[0] || data?.amount_paid?.[0] || "Checkout failed."
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (paymentType === "PAY_NOW") resetCreditFields();
  }, [paymentType]);

  const showPaymentMethodDisabled = paymentType === "CREDIT" && (!amountPaid || Number(amountPaid) === 0);

  return (
    <Card>
      <CardHeader
        title="POS"
        subtitle="Scan SKU or search products, build cart, checkout."
        right={
          <Button variant="secondary" onClick={() => nav("/app/sales")}>
            My Sales
          </Button>
        }
      />

      <CardBody className="!px-4 !pt-0 sm:!px-6">

        {/* ── Add items: SKU scan + name search ── */}
        {/* FIX: stack vertically on mobile, side-by-side on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={addSku} className="rounded-2xl border border-gray-100 bg-white p-4">
            {/* FIX: flex-wrap so button doesn't overflow at narrow widths */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  label="Scan / type SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Scan barcode..."
                />
              </div>
              <Button type="submit" disabled={busy} className="flex-shrink-0">
                {busy ? "..." : "Add"}
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">Tip: press Enter after scanning.</div>
          </form>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <Input
              label="Search product by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. milk, sugar, rice..."
            />
            <div className="mt-3">
              {searching ? (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Loader small /> Searching...
                </div>
              ) : results.length ? (
                <div className="space-y-2">
                  {results.map((p) => (
                    // FIX: flex-wrap so long names + Add button don't overflow
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate">{p.sku} · {p.selling_price}</div>
                      </div>
                      <Button variant="secondary" onClick={() => addToCart(p)} className="flex-shrink-0">
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : search.trim() ? (
                <div className="text-sm text-gray-600">No results.</div>
              ) : (
                <div className="text-sm text-gray-600">Start typing to search.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Cart + Summary ── */}
        {/* FIX: summary stacks below cart on mobile, side-by-side on lg */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,340px)] gap-4 sm:gap-6">

          {/* Cart — replaced <table> with card-style rows on mobile */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            {cart.length === 0 ? (
              <div className="py-10 px-4 text-gray-500 text-sm">
                Cart empty. Scan a SKU or search by name.
              </div>
            ) : (
              <>
                {/* Desktop table — hidden on mobile */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b bg-gray-50">
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((row) => {
                        const pid = row.product.id;
                        const shown = qtyDraft[pid] != null ? qtyDraft[pid] : String(row.quantity);
                        return (
                          <tr key={pid} className="border-b last:border-b-0">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 truncate max-w-[160px]">{row.product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {row.product.sku}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">{row.product.selling_price}</td>
                            <td className="py-3 px-4">
                              <input
                                className="w-20 rounded-xl border border-gray-200 p-2 text-sm"
                                inputMode="numeric"
                                value={shown}
                                onChange={(e) => onQtyChange(pid, e.target.value)}
                                onBlur={() => commitQty(pid)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitQty(pid); } }}
                              />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-medium">
                              {(Number(row.product.selling_price) * row.quantity).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button variant="ghost" onClick={() => removeFromCart(pid)}>Remove</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cart — card rows, visible only on small screens */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {cart.map((row) => {
                    const pid = row.product.id;
                    const shown = qtyDraft[pid] != null ? qtyDraft[pid] : String(row.quantity);
                    const lineTotal = (Number(row.product.selling_price) * row.quantity).toFixed(2);
                    return (
                      <div key={pid} className="p-4 space-y-2">
                        {/* Name + remove */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{row.product.name}</div>
                            <div className="text-xs text-gray-500">SKU: {row.product.sku}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(pid)}
                            className="text-xs text-red-600 hover:text-red-700 flex-shrink-0 mt-0.5"
                          >
                            Remove
                          </button>
                        </div>
                        {/* Price · Qty · Total */}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">Price: <span className="text-gray-900 font-medium">{row.product.selling_price}</span></span>
                          <span className="text-gray-300">|</span>
                          <label className="text-gray-500 flex items-center gap-1">
                            Qty:
                            <input
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm ml-1"
                              inputMode="numeric"
                              value={shown}
                              onChange={(e) => onQtyChange(pid, e.target.value)}
                              onBlur={() => commitQty(pid)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitQty(pid); } }}
                            />
                          </label>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-900 font-semibold ml-auto">{lineTotal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Summary / Checkout */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 h-fit">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold text-gray-900">Summary</div>
              <Badge tone={paymentType === "CREDIT" ? "yellow" : "blue"}>{paymentType}</Badge>
            </div>

            <div className="mt-4 text-sm text-gray-700 flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">{subtotal.toFixed(2)}</span>
            </div>

            <div className="mt-4 space-y-3">
              <Select label="Payment type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="PAY_NOW">PAY NOW</option>
                <option value="CREDIT">CREDIT</option>
              </Select>

              <Select
                label={
                  showPaymentMethodDisabled
                    ? "Payment method (enter amount paid to enable)"
                    : "Payment method"
                }
                value={payment_method}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={showPaymentMethodDisabled}
              >
                <option value="CASH">CASH</option>
                <option value="MPESA">MPESA</option>
                <option value="CARD">CARD</option>
                <option value="BANK">BANK</option>
              </Select>

              {paymentType === "CREDIT" ? (
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <div className="text-xs font-medium text-gray-700 mb-3">Credit details</div>
                  <div className="grid grid-cols-1 gap-3">
                    <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    <Input
                      label="Amount paid now (optional)"
                      value={amountPaid}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^[0-9]+(\.[0-9]{0,2})?$/.test(v)) setAmountPaid(v);
                      }}
                      placeholder="0.00"
                    />
                    <Input label="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. John" />
                    <Input label="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 07..." />
                    <div className="text-xs text-gray-500">
                      If <span className="font-medium">amount paid now</span> is 0, the sale is recorded as credit and an <span className="font-medium">invoice</span> should be issued.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {err ? <div className="text-sm text-red-600 mt-4 break-words">{err}</div> : null}

            <Button className="w-full mt-4" disabled={busy} onClick={checkout}>
              {busy ? "Processing..." : "Checkout"}
            </Button>

            {ok ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm space-y-1">
                <div className="font-semibold">Sale recorded ✅</div>
                <div className="text-gray-600 break-words">
                  Sale #{ok.id} · Total {ok.total} · {ok.payment_status}
                </div>
                <div className="text-gray-600 break-words">
                  Document:{" "}
                  {ok.document_type === "INVOICE"
                    ? `Invoice ${ok.invoice?.invoice_number || "—"}`
                    : `Receipt ${ok.receipt?.receipt_number || "—"}`}
                </div>
                {ok.document_type === "INVOICE" ? (
                  <>
                    <div className="text-gray-600">Paid now: {ok.amount_paid} · Balance: {ok.balance_due}</div>
                    <div className="text-gray-600">Due: {ok.due_date || ok.invoice?.due_date || "—"}</div>
                  </>
                ) : null}
                {/* FIX: flex-wrap so buttons stack if summary panel is narrow */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => nav(`/app/sales/${ok.id}`)}>
                    View Sale
                  </Button>
                  {ok.document_type === "INVOICE" ? (
                    <Button onClick={() => nav(`/app/sales/${ok.id}/invoice`)}>Invoice</Button>
                  ) : (
                    <Button onClick={() => nav(`/app/sales/${ok.id}/receipt`)}>Receipt</Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}