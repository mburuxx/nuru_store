import { api } from "./client";

export const dashboardApi = {
  
  summary(params = {}) {
    return api.get("/api/dashboard/summary/", { params });
  },
  salesTrend(params = {}) {
    return api.get("/api/dashboard/sales-trend/", { params });
  },
  topProducts(params = {}) {
    return api.get("/api/dashboard/top-products/", { params });
  },
  cashiers(params = {}) {
    return api.get("/api/dashboard/cashiers/", { params });
  },
  inventoryHealth() {
    return api.get("/api/dashboard/inventory-health/");
  },
  recentActivity() {
    return api.get("/api/dashboard/recent-activity/");
  },

  
  cashierSummary(params = {}) {
    return api.get("/api/dashboard/cashier/summary/", { params });
  },
  cashierSalesTrend(params = {}) {
    return api.get("/api/dashboard/cashier/sales-trend/", { params });
  },
  cashierRecentSales(params = {}) {
    return api.get("/api/dashboard/cashier/recent-sales/", { params });
  },
};