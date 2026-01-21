import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi } from "../../api/catalog";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

export default function CategoriesPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await catalogApi.listCategories({ search: q || undefined, ordering: "name" });
      setItems(res.data?.results || res.data || []);
    } catch {
      setErr("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function toggleActive(c) {
    try {
      if (c.is_active) await catalogApi.deactivateCategory(c.id);
      else await catalogApi.activateCategory(c.id);
      load();
    } catch {
      setErr("Failed to update category status.");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Categories"
        subtitle="Create, edit, activate/deactivate categories."
        right={<Button onClick={() => nav("/app/owner/catalog/categories/new")}>New category</Button>}
      />
      <CardBody>
        <div className="max-w-md">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. electronics" />
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No categories yet"
              subtitle="Create your first category to start organizing products."
              action={<Button onClick={() => nav("/app/owner/catalog/categories/new")}>Create category</Button>}
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-b">
                  <th className="py-3">Name</th>
                  <th className="py-3">Slug</th>
                  <th className="py-3">Parent</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 text-gray-600">{c.slug}</td>
                    <td className="py-3 text-gray-600">{c.parent ?? "—"}</td>
                    <td className="py-3">
                      <Badge tone={c.is_active ? "green" : "red"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <Button variant="ghost" onClick={() => nav(`/app/owner/catalog/categories/${c.id}/edit`)}>
                        Edit
                      </Button>
                      <Button
                        variant={c.is_active ? "secondary" : "primary"}
                        onClick={() => toggleActive(c)}
                      >
                        {c.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}