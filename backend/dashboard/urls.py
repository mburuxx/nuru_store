from django.urls import path
from .views import (
    DashboardSummaryAPIView,
    SalesTrendAPIView,
    TopProductsAPIView,
    CashierPerformanceAPIView,
    InventoryHealthAPIView,
    RecentActivityAPIView,
    CashierSummaryAPIView,
    CashierSalesTrendAPIView,
    CashierRecentSalesAPIView,
)

urlpatterns = [
    path("summary/", DashboardSummaryAPIView.as_view()),
    path("sales-trend/", SalesTrendAPIView.as_view()),
    path("top-products/", TopProductsAPIView.as_view()),
    path("cashiers/", CashierPerformanceAPIView.as_view()),
    path("inventory-health/", InventoryHealthAPIView.as_view()),
    path("recent-activity/", RecentActivityAPIView.as_view()),
    path("cashier/summary/", CashierSummaryAPIView.as_view()),
    path("cashier/sales-trend/", CashierSalesTrendAPIView.as_view()),
    path("cashier/recent-sales/", CashierRecentSalesAPIView.as_view()),
]