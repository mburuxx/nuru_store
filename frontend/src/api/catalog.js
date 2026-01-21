import { api } from "./client";

export const catalogApi = {
  // categories
  listCategories: (params) => api.get("/api/catalog/categories/", { params }),
  getCategory: (id) => api.get(`/api/catalog/categories/${id}/`),
  createCategory: (payload) => api.post("/api/catalog/categories/", payload),
  updateCategory: (id, payload) => api.patch(`/api/catalog/categories/${id}/`, payload),
  activateCategory: (id) => api.post(`/api/catalog/categories/${id}/activate/`),
  deactivateCategory: (id) => api.post(`/api/catalog/categories/${id}/deactivate/`),

  // products
  listProducts: (params) => api.get("/api/catalog/products/", { params }),
  getProduct: (id) => api.get(`/api/catalog/products/${id}/`),
  createProduct: (payload) => api.post("/api/catalog/products/", payload),
  updateProduct: (id, payload) => api.patch(`/api/catalog/products/${id}/`, payload),
  activateProduct: (id) => api.post(`/api/catalog/products/${id}/activate/`),
  deactivateProduct: (id) => api.post(`/api/catalog/products/${id}/deactivate/`),
  getBySku: (sku) => api.get(`/api/catalog/products/sku/${encodeURIComponent(sku)}/`),
};