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
  const [togglingId, setTogglingId] = useState(null);

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
  }, [q]);

  async function toggleActive(e, c) {
    // Stop the click from bubbling up to the row's nav handler
    e.stopPropagation();
    setTogglingId(c.id);
    try {
      if (c.is_active) await catalogApi.deactivateCategory(c.id);
      else await catalogApi.activateCategory(c.id);
      load();
    } catch {
      setErr("Failed to update category status.");
    } finally {
      setTogglingId(null);
    }
  }

  function goEdit(id) {
    nav(`/app/owner/catalog/categories/${id}/edit`);
  }

  return (
    <Card>
      <CardHeader
        title="Categories"
        subtitle="Tap a category to edit it."
        right={
          <Button onClick={() => nav("/app/owner/catalog/categories/new")}>
            New category
          </Button>
        }
      />

      <CardBody className="!px-4 !pt-0 sm:!px-6">
        <div className="max-w-md">
          <Input
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. electronics"
          />
        </div>

        {err ? <div className="text-sm text-red-600 mt-4">{err}</div> : null}

        {loading ? (
          <div className="mt-4"><Loader /></div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No categories yet"
              subtitle="Create your first category to start organizing products."
              action={
                <Button onClick={() => nav("/app/owner/catalog/categories/new")}>
                  Create category
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* ── Desktop table — hidden on mobile ── */}
            <div className="hidden sm:block mt-6">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr className="border-b">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Slug</th>
                    <th className="py-3 pr-4">Parent</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => goEdit(c.id)}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900 max-w-[160px] truncate">
                        {c.name}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[140px] truncate">{c.slug}</td>
                      <td className="py-3 pr-4 text-gray-500">{c.parent ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={c.is_active ? "green" : "red"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant={c.is_active ? "secondary" : "primary"}
                          onClick={(e) => toggleActive(e, c)}
                          disabled={togglingId === c.id}
                        >
                          {togglingId === c.id
                            ? "..."
                            : c.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card rows — hidden on desktop ── */}
            <div className="sm:hidden mt-4 space-y-2">
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goEdit(c.id)}
                  className="w-full text-left rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 active:bg-gray-100 transition p-4"
                >
                  {/* Row 1: name + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-gray-900 truncate min-w-0">{c.name}</span>
                    <Badge tone={c.is_active ? "green" : "red"} className="flex-shrink-0">
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Row 2: slug + parent */}
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 min-w-0">
                    <span className="truncate">{c.slug}</span>
                    {c.parent ? (
                      <>
                        <span className="text-gray-300 flex-shrink-0">·</span>
                        <span className="truncate">Parent: {c.parent}</span>
                      </>
                    ) : null}
                  </div>

                  {/* Row 3: toggle — stopPropagation so it doesn't trigger edit nav */}
                  <div
                    className="mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant={c.is_active ? "secondary" : "primary"}
                      onClick={(e) => toggleActive(e, c)}
                      disabled={togglingId === c.id}
                    >
                      {togglingId === c.id
                        ? "Updating..."
                        : c.is_active ? "Deactivate" : "Activate"}
                    </Button>
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