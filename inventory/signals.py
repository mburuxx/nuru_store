from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Inventory, StockMovement
from notifications.models import Notification
from .utils import reorder_point, is_low_stock

User = get_user_model()
@receiver(post_save, sender=StockMovement)
def apply_stock_movement(sender, instance: StockMovement, created, **kwargs):
    if not created:
        return

    with transaction.atomic():
        inv = Inventory.objects.select_for_update().get(product=instance.product)

        old_low_stock = inv.low_stock_flag  # <-- capture before changing quantity

        if instance.direction == StockMovement.Direction.IN:
            inv.quantity += instance.quantity
        else:
            if inv.quantity < instance.quantity:
                raise ValueError(
                    f"Insufficient stock for {instance.product.sku}: "
                    f"have {inv.quantity}, tried to subtract {instance.quantity}"
                )
            inv.quantity -= instance.quantity

        new_low_stock = is_low_stock(inv)
        inv.low_stock_flag = new_low_stock
        inv.save(update_fields=["quantity", "low_stock_flag", "updated_at"])

        # ✅ Notify owners only when transitioning False -> True (avoid spam)
        if (old_low_stock is False) and (new_low_stock is True):
            owners = User.objects.filter(profile__role="OWNER", is_active=True)

            # Optional: include reorder point in message
            rp = reorder_point(inv)

            for owner in owners:
                Notification.objects.create(
                    recipient=owner,
                    type=Notification.Type.LOW_STOCK,
                    message=(
                        f"Low stock: {inv.product.name} ({inv.product.sku}). "
                        f"Qty: {inv.quantity} (<= {rp})"
                    ),
                    product_id=inv.product_id,
                )


def _is_low_stock(inv: Inventory) -> bool:
    rp = reorder_point(inv)
    if rp <= 0:
        return False
    return inv.quantity <= rp