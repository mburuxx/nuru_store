from django.urls import path

from .views import (
    AdjustStockAPIView,
    InventoryDetailAPIView,
    InventoryListAPIView,
    InventoryUpdateAPIView,
    ReturnStockAPIView,
    SetReorderAPIView,
    StockMovementListAPIView,
    SupplyStockAPIView,
)

urlpatterns = [
    # inventory items
    path("items/", InventoryListAPIView.as_view(), name="inventory-list"),
    path("items/<int:pk>/", InventoryDetailAPIView.as_view(), name="inventory-detail"),
    path("items/<int:pk>/config/", InventoryUpdateAPIView.as_view(), name="inventory-config"),

    # movements
    path("movements/", StockMovementListAPIView.as_view(), name="stock-movement-list"),

    # operations
    path("ops/supply/", SupplyStockAPIView.as_view(), name="stock-supply"),
    path("ops/adjust/", AdjustStockAPIView.as_view(), name="stock-adjust"),
    path("ops/return/", ReturnStockAPIView.as_view(), name="stock-return"),
    path("ops/set-reorder/", SetReorderAPIView.as_view(), name="set-reorder"),
]