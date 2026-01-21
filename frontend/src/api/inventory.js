import { api } from "./client";

export const inventoryApi = {
  listItems: (params) => api.get("/api/inventory/items/", { params }),
  getItem: (id) => api.get(`/api/inventory/items/${id}/`),
  updateConfig: (id, payload) => api.patch(`/api/inventory/items/${id}/config/`, payload),

  listMovements: (params) => api.get("/api/inventory/movements/", { params }),

  supply: (payload) => api.post("/api/inventory/ops/supply/", payload),
  adjust: (payload) => api.post("/api/inventory/ops/adjust/", payload),
  ret: (payload) => api.post("/api/inventory/ops/return/", payload),
  setReorder: (payload) => api.post("/api/inventory/ops/set-reorder/", payload),
};