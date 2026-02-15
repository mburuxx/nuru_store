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

    class PaymentType(models.TextChoices):
        PAY_NOW = "PAY_NOW", "Pay Now"
        CREDIT = "CREDIT", "Credit"

    class PaymentStatus(models.TextChoices):
        PAID = "PAID", "Paid"
        UNPAID = "UNPAID", "Unpaid"
        PARTIAL = "PARTIAL", "Partial"

    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sales",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)

    payment_type = models.CharField(max_length=20, choices=PaymentType.choices, default=PaymentType.PAY_NOW)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PAID)

    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, null=True, blank=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    due_date = models.DateField(null=True, blank=True)

    customer_name = models.CharField(max_length=120, blank=True)
    customer_phone = models.CharField(max_length=30, blank=True)

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
    
class Invoice(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"

    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name="invoice")
    invoice_number = models.CharField(max_length=40, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    due_date = models.DateField()
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.invoice_number


class Payment(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    method = models.CharField(max_length=20, choices=Sale.PaymentMethod.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])

    reference = models.CharField(max_length=60, blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_payments",
    )
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]