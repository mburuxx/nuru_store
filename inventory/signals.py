from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Inventory, StockMovement


@receiver(post_save, sender=StockMovement)
def apply_stock_movement(sender, instance: StockMovement, created, **kwargs):
    if not created:
        return

    with transaction.atomic():
        inv = Inventory.objects.select_for_update().get(product=instance.product)

        if instance.direction == StockMovement.Direction.IN:
            inv.quantity += instance.quantity
        else:
            # Prevent negative stock
            if inv.quantity < instance.quantity:
                # rollback by raising error
                raise ValueError(
                    f"Insufficient stock for {instance.product.sku}: "
                    f"have {inv.quantity}, tried to subtract {instance.quantity}"
                )
            inv.quantity -= instance.quantity

        # Update low stock flag based on reorder rules
        inv.low_stock_flag = _is_low_stock(inv)
        inv.save(update_fields=["quantity", "low_stock_flag", "updated_at"])


def _reorder_point(inv: Inventory) -> int:
    if inv.reorder_level is None:
        return 0
    return (inv.reorder_level * inv.reorder_threshold_percent + 99) // 100


def _is_low_stock(inv: Inventory) -> bool:
    rp = _reorder_point(inv)
    if rp <= 0:
        return False
    return inv.quantity <= rp