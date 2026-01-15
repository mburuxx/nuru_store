from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

from catalog.models import Product

class Sale(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        VOIDED = "VOIDED", "Voided"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        MPESA = "MPESA", "M-Pesa"
        CARD = "CARD", "Card"
        BANK = "BANK", "Bank"

    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sales",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Sale #{self.id} - {self.status}"

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sale_items")
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.product.sku} x{self.quantity}"


class Receipt(models.Model):
    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name="receipt")
    receipt_number = models.CharField(max_length=40, unique=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.receipt_number