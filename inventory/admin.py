from django.contrib import admin
from .models import Inventory, StockMovement

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("product", "quantity", "reorder_threshold_percent", "reorder_level", "low_stock_flag", "updated_at")
    search_fields = ("product__name", "product__sku")
    list_filter = ("low_stock_flag",)

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("product", "movement_type", "direction", "quantity", "created_by", "created_at")
    search_fields = ("product__name", "product__sku", "notes")
    list_filter = ("movement_type", "direction")