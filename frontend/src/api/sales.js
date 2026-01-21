import { api } from "./client";

export const salesApi = {
  list: (params) => api.get("/api/sales/", { params }),
  create: (payload) => api.post("/api/sales/create/", payload),
  detail: (id) => api.get(`/api/sales/${id}/`),
  voidSale: (id, payload) => api.post(`/api/sales/${id}/void/`, payload),
};