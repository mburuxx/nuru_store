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
  const [cart, setCart] = useState([]); // {product, quantity:number}
  const [payment_method, setPaymentMethod] = useState("CASH");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  // For safe typing: productId -> string value user is editing
  const [qtyDraft, setQtyDraft] = useState({}); // { [productId]: "3" | "" | "12" }

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, row) => sum + Number(row.product.selling_price) * row.quantity, 0);
  }, [cart]);

  // --- SKU add ---
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

  // --- Name search (debounced) ---
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setResults([]);
      return;
    }

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
        // keep draft in sync
        setQtyDraft((d) => ({ ...d, [p.id]: String(copy[idx].quantity) }));
        return copy;
      }
      setQtyDraft((d) => ({ ...d, [p.id]: "1" }));
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((row) => row.product.id !== productId));
    setQtyDraft((d) => {
      const copy = { ...d };
      delete copy[productId];
      return copy;
    });
  }

  // User typing: do NOT convert to number yet
  function onQtyChange(productId, raw) {
    // allow only digits or empty (so backspace works)
    if (raw === "" || /^[0-9]+$/.test(raw)) {
      setQtyDraft((d) => ({ ...d, [productId]: raw }));
    }
  }

  // Commit on blur/enter
  function commitQty(productId) {
    const raw = qtyDraft[productId];

    // If empty, restore previous quantity or default to 1
    if (raw === "" || raw == null) {
      const existing = cart.find((r) => r.product.id === productId)?.quantity ?? 1;
      setQtyDraft((d) => ({ ...d, [productId]: String(existing) }));
      return;
    }

    const n = Number(raw);

    // Optional behavior:
    // - 0 removes item
    // - <0 -> clamp
    if (Number.isNaN(n)) return;

    if (n === 0) {
      removeFromCart(productId);
      return;
    }

    const finalQty = Math.max(1, n);

    setCart((prev) =>
      prev.map((row) => (row.product.id === productId ? { ...row, quantity: finalQty } : row))
    );
    setQtyDraft((d) => ({ ...d, [productId]: String(finalQty) }));
  }

  async function checkout() {
    setErr("");
    setOk(null);

    if (cart.length === 0) {
      setErr("Cart is empty.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        payment_method,
        items: cart.map((row) => ({ product_id: row.product.id, quantity: row.quantity })),
      };
      const res = await salesApi.create(payload);
      setOk(res.data);
      setCart([]);
      setQtyDraft({});
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="POS"
        subtitle="Scan SKU or search products, build cart, checkout."
        right={<Button variant="secondary" onClick={() => nav("/app/sales")}>My Sales</Button>}
      />
      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 max-w-5xl">
          {/* SKU form */}
          <form onSubmit={addSku} className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Scan / type SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Scan barcode..."
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "..." : "Add"}
              </Button>
            </div>
            <div className="mt-3 text-xs text-gray-500">Tip: press Enter after scanning.</div>
          </form>

          {/* Name search */}
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
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku} • {p.selling_price}</div>
                      </div>
                      <Button variant="secondary" onClick={() => addToCart(p)}>Add</Button>
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

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Cart table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
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
                  const draft = qtyDraft[pid];
                  const shown = draft != null ? draft : String(row.quantity);

                  return (
                    <tr key={pid} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{row.product.name}</div>
                        <div className="text-xs text-gray-500">SKU: {row.product.sku}</div>
                      </td>
                      <td className="py-3 px-4">{row.product.selling_price}</td>
                      <td className="py-3 px-4">
                        <input
                          className="w-24 rounded-xl border border-gray-200 p-2"
                          inputMode="numeric"
                          value={shown}
                          onChange={(e) => onQtyChange(pid, e.target.value)}
                          onBlur={() => commitQty(pid)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitQty(pid);
                            }
                          }}
                        />
                        <div className="text-xs text-gray-400 mt-1">Clear then type (safe)</div>
                      </td>
                      <td className="py-3 px-4">
                        {(Number(row.product.selling_price) * row.quantity).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" onClick={() => removeFromCart(pid)}>Remove</Button>
                      </td>
                    </tr>
                  );
                })}
                {cart.length === 0 ? (
                  <tr>
                    <td className="py-10 px-4 text-gray-500" colSpan={5}>
                      Cart empty. Scan a SKU or search by name.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 h-fit">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">Summary</div>
              <Badge tone="blue">{payment_method}</Badge>
            </div>

            <div className="mt-4 text-sm text-gray-700 flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">{subtotal.toFixed(2)}</span>
            </div>

            <div className="mt-4">
              <Select
                label="Payment method"
                value={payment_method}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">CASH</option>
                <option value="MPESA">MPESA</option>
                <option value="CARD">CARD</option>
                <option value="BANK">BANK</option>
              </Select>
            </div>

            {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

            <Button className="w-full mt-4" disabled={busy} onClick={checkout}>
              {busy ? "Processing..." : "Checkout"}
            </Button>

            {ok ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
                <div className="font-semibold">Sale complete ✅</div>
                <div className="text-gray-600">Sale #{ok.id} • Total {ok.total}</div>
                <div className="text-gray-600">Receipt: {ok.receipt?.receipt_number || "—"}</div>

                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => nav(`/app/sales/${ok.id}`)}>View Sale</Button>
                  <Button onClick={() => nav(`/app/sales/${ok.id}/receipt`)}>Receipt</Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}