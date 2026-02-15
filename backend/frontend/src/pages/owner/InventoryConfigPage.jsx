import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { inventoryApi } from "../../api/inventory";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function InventoryConfigPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [meta, setMeta] = useState({ name: "", sku: "" });
  const [form, setForm] = useState({ reorder_level: "", reorder_threshold_percent: "" });

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const res = await inventoryApi.getItem(id);
        const row = res.data;
        setMeta({ name: row.product?.name || "", sku: row.product?.sku || "" });
        setForm({
          reorder_level: row.reorder_level ?? "",
          reorder_threshold_percent: row.reorder_threshold_percent ?? 10,
        });
      } catch {
        setErr("Failed to load inventory config.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function onSave(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await inventoryApi.updateConfig(id, {
        reorder_level: form.reorder_level === "" ? null : Number(form.reorder_level),
        reorder_threshold_percent: Number(form.reorder_threshold_percent),
      });
      setOk("Saved.");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Reorder settings"
        subtitle={meta.sku ? `${meta.name} • ${meta.sku}` : "Configure reorder rules"}
        right={<Button variant="secondary" onClick={() => nav(-1)}>Back</Button>}
      />
      <CardBody>
        {loading ? <Loader /> : (
          <form onSubmit={onSave} className="space-y-4 max-w-xl">
            <Input
              label="Reorder level (0+)"
              value={form.reorder_level}
              onChange={(e)=>setForm(s=>({...s, reorder_level:e.target.value}))}
              placeholder="e.g. 200"
            />
            <Input
              label="Threshold percent (1-100)"
              value={form.reorder_threshold_percent}
              onChange={(e)=>setForm(s=>({...s, reorder_threshold_percent:e.target.value}))}
              placeholder="e.g. 10"
            />

            {err ? <div className="text-sm text-red-600">{err}</div> : null}
            {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}