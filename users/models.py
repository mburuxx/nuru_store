from django.db import models
from django.conf import settings

class UserProfile(models.Model):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        CASHIER = "CASHIER", "Cashier"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CASHIER)
    phone = models.CharField(max_length=30, blank=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"