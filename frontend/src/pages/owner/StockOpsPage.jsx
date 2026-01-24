import React, { useEffect, useMemo, useState } from "react";
import { catalogApi } from "../../api/catalog";
import { inventoryApi } from "../../api/inventory";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

export default function StockOpsPage() {
  // selection
  const [sku, setSku] = useState("");
  const [selected, setSelected] = useState(null); // product object (from ProductReadSerializer)

  // search
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  // operation inputs
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [direction, setDirection] = useState("IN");

  // status
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  // new prices
  const [newCost, setNewCost] = useState("");
  const [newSell, setNewSell] = useState("");

  // debounce search
  useEffect(() => {
    const s = q.trim();
    if (!s) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await catalogApi.listProducts({ search: s, ordering: "name" });
        const rows = res.data?.results || res.data || [];
        setResults(rows.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  // if user types SKU directly, fetch product details (so we can show name/category)
  useEffect(() => {
    const s = sku.trim();
    if (!s) {
      setSelected(null);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await catalogApi.getBySku(s);
        setSelected(res.data);
      } catch {
        // keep selected null; we'll show a warning below
        setSelected(null);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [sku]);

  const display = useMemo(() => {
    if (!selected) return null;
    return {
      name: selected.name,
      sku: selected.sku,
      categoryName: selected.category?.name || "—",
      qty: selected.quantity ?? 0,
      active: !!selected.is_active,
      price: selected.selling_price,
    };
  }, [selected]);

  async function run(op) {
    setErr("");
    setOk("");

    const s = sku.trim();
    const n = Number(qty);

    if (!s) {
      setErr("Select a product or type a SKU.");
      return;
    }
    if (!n || n < 1) {
      setErr("Quantity must be 1+");
      return;
    }

    setBusy(true);
    try {
      const payload = { sku: s, quantity: n, notes };

      if (op === "supply") {
        const c = newCost.trim();
        const sp = newSell.trim();
        
        if (c) payload.new_cp = Number(c);
        if (sp) payload.new_sp = Number(sp);

        await inventoryApi.supply(payload)
      }
      if (op === "return") await inventoryApi.ret(payload);
      if (op === "adjust") await inventoryApi.adjust({ ...payload, direction });

      setOk("Recorded ✅");

      // refresh selected product so quantity updates on screen
      try {
        const fresh = await catalogApi.getBySku(s);
        setSelected(fresh.data);
      } catch {}

      // clear fields
      setQty("");
      setNotes("");
      setNewCost("");
      setNewSell("");
    } catch (e2) {
      const data = e2?.response?.data;
      setErr(data?.detail || data?.sku?.[0] || data?.product_id?.[0] || e2?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  function selectProduct(p) {
    setSelected(p);
    setSku(p.sku);
    setOk("");
    setErr("");
  }

  return (
    <Card>
      <CardHeader
        title="Stock operations"
        subtitle="Supply, adjust, or record returns with full product context."
        right={
          <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Top
          </Button>
        }
      />
      <CardBody>
        {/* Search + select */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <Input
              label="Search product (name or SKU)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. milk, sugar, 12345"
            />

            <div className="mt-3">
              {searching ? (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Loader small /> Searching...
                </div>
              ) : results.length ? (
                <div className="space-y-2">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProduct(p)}
                      className="w-full text-left flex items-center justify-between rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          {p.sku} • {p.category?.name || "—"} • Stock: {p.quantity ?? 0}
                        </div>
                      </div>
                      <Badge tone="blue">Select</Badge>
                    </button>
                  ))}
                </div>
              ) : q.trim() ? (
                <div className="text-sm text-gray-600">No results.</div>
              ) : (
                <div className="text-sm text-gray-600">Search to select a product.</div>
              )}
            </div>
          </div>

          {/* SKU + info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <Input
              label="SKU (quick entry)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Scan / type SKU"
            />

            <div className="mt-4">
              {display ? (
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{display.name}</div>
                      <div className="text-xs text-gray-500">{display.sku} • {display.categoryName}</div>
                      <div className="text-xs text-gray-500 mt-1">Price: {display.price}</div>
                    </div>
                    <Badge tone={display.active ? "green" : "red"}>
                      {display.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="mt-3 text-sm flex items-center justify-between">
                    <span className="text-gray-600">Current stock</span>
                    <span className="font-semibold">{display.qty}</span>
                  </div>
                </div>
              ) : sku.trim() ? (
                <div className="text-sm text-red-600 mt-3">
                  SKU not found or inactive. Create product first (Owner → Products), then supply stock.
                </div>
              ) : (
                <div className="text-sm text-gray-600 mt-3">
                  Select a product from search, or enter SKU to load details.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ops form */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <Input
            label="Quantity"
            value={qty}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^[0-9]+$/.test(v)) setQty(v);
            }}
            placeholder="e.g. 10"
          />

          <Input
            label="New cost price"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            placeholder="e.g. 1200"
          />

          <Input
            label="New selling price"
            value={newSell}
            onChange={(e) => setNewSell(e.target.value)}
            placeholder="e.g. 1200"
          />
          
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Supplier delivery / Opening stock / Damaged"
          />

          <Select
            label="Adjustment direction (only for Adjust)"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </Select>
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}
        {ok ? <div className="text-sm text-green-700 mt-4">{ok}</div> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => run("supply")}>
            {busy ? "Working..." : "Supply (IN)"}
          </Button>
          <Button disabled={busy} variant="secondary" onClick={() => run("adjust")}>
            Adjust (IN/OUT)
          </Button>
          <Button disabled={busy} variant="ghost" onClick={() => run("return")}>
            Return (IN)
          </Button>
        </div>

        {/* Guidance */}
        <div className="mt-6 text-sm text-gray-600">
          <div className="font-medium text-gray-900">How receiving works in your app:</div>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li><span className="font-medium">New product?</span> Create it first (Products: name, category, SKU, prices).</li>
            <li><span className="font-medium">Goods arrived?</span> Supply stock (IN). This creates a StockMovement for audit.</li>
            <li><span className="font-medium">Stock count correction?</span> Use Adjust (IN/OUT) with a clear note.</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}