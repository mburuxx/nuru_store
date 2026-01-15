from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from catalog.models import Product

class Inventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.PositiveIntegerField(default=0)

    reorder_threshold_percent = models.PositiveSmallIntegerField(default=10)
    reorder_level = models.PositiveIntegerField(null=True, blank=True)
    low_stock_flag = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Inventory: {self.product.sku} = {self.quantity}"
    

class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        SALE = "SALE", "Sale"
        SUPPLY = "SUPPLY", "Supply"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        RETURN = "RETURN", "Return"
        VOID = "VOID", "Void"

    class Direction(models.TextChoices):
        IN = "IN", "In"
        OUT = "OUT", "Out"

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="stock_movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    direction = models.CharField(max_length=3, choices=Direction.choices)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_stock_movements"
    )
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.product.sku} {self.direction} {self.quantity} ({self.movement_type})"

        