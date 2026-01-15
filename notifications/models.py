from django.db import models
from django.conf import settings

class Notification(models.Model):
    class Type(models.TextChoices):
        SALE_MADE = "SALE_MADE", "Sale made"
        LOW_STOCK = "LOW_STOCK", "Low stock"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        )
    
    type = models.CharField(max_length=30, choices=Type.choices)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)

    product_id = models.IntegerField(null=True, blank=True)
    sale_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.type} -> {self.recipient}"