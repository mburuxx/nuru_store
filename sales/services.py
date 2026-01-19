from decimal import Decimal
from django.db import transaction
from django.db.models import F

from catalog.models import Product
from inventory.models import Inventory, StockMovement
from notifications.models import Notification
from .models import Sale, SaleItem, Receipt
from .utils import generate_receipt_number


class InsufficientStock(Exception):
    pass


def _is_low_stock(inv: Inventory) -> bool:
    if inv.reorder_level is not None:
        return inv.quantity <= inv.reorder_level
    return inv.quantity <= 0


@transaction.atomic
def create_sale(*, cashier, payment_method: str, items: list[dict], receipt_prefix="RCPT") -> Sale:
    product_ids = [i["product_id"] for i in items]

    inventories = (
        Inventory.objects.select_for_update()
        .select_related("product")
        .filter(product_id__in=product_ids)
    )
    inv_map = {inv.product_id: inv for inv in inventories}

    subtotal = Decimal("0.00")
    sale_items_to_create = []

    for i in items:
        pid = i["product_id"]
        qty = int(i["quantity"])

        inv = inv_map.get(pid)
        if not inv:
            raise ValueError(f"Inventory not found for product_id={pid}")

        if inv.product.is_active is False:
            raise ValueError(f"Product inactive: {inv.product.sku}")

        if inv.quantity < qty:
            raise InsufficientStock(
                f"Insufficient stock for {inv.product.sku}. Have {inv.quantity}, need {qty}"
            )

        unit_price = inv.product.selling_price
        line_total = (unit_price * Decimal(qty)).quantize(Decimal("0.01"))
        subtotal += line_total
        sale_items_to_create.append((inv.product, qty, unit_price, line_total))

    sale = Sale.objects.create(
        cashier=cashier,
        payment_method=payment_method,
        subtotal=subtotal,
        discount=Decimal("0.00"),
        total=subtotal,
        status=Sale.Status.COMPLETED,
    )

    for product, qty, unit_price, line_total in sale_items_to_create:
        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=qty,
            unit_price_snapshot=unit_price,
            line_total=line_total,
        )

        # ONLY create movement. Inventory will update via inventory.signals.apply_stock_movement
        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.SALE,
            direction=StockMovement.Direction.OUT,
            quantity=qty,
            created_by=cashier,
            sale=sale,
            notes=f"Sale #{sale.id}",
        )

    receipt_no = generate_receipt_number(prefix=receipt_prefix)
    Receipt.objects.create(sale=sale, receipt_number=receipt_no)

    # Notifications (keep)
    owner_users = cashier.__class__.objects.filter(profile__role="OWNER", is_active=True)
    for owner in owner_users:
        Notification.objects.create(
            recipient=owner,
            type=Notification.Type.SALE_MADE,
            message=f"Sale #{sale.id} completed. Total: {sale.total}",
            sale_id=sale.id,
        )

    return sale

class AlreadyVoided(Exception):
    pass


@transaction.atomic
def void_sale(*, sale_id: int, voided_by, notes: str = "") -> Sale:
    sale = Sale.objects.select_for_update().prefetch_related("items__product").get(id=sale_id)

    if sale.status == Sale.Status.VOIDED:
        raise AlreadyVoided("Sale already voided.")

    # reverse stock using movements (signal will add back stock)
    for item in sale.items.all():
        StockMovement.objects.create(
            product=item.product,
            movement_type=StockMovement.MovementType.VOID,
            direction=StockMovement.Direction.IN,
            quantity=item.quantity,
            created_by=voided_by,
            sale=sale,
            notes=notes or f"Void Sale #{sale.id}",
        )

    sale.status = Sale.Status.VOIDED
    sale.save(update_fields=["status"])

    # Notify owners (optional)
    owner_users = voided_by.__class__.objects.filter(profile__role="OWNER", is_active=True)
    for owner in owner_users:
        Notification.objects.create(
            recipient=owner,
            type=Notification.Type.SALE_VOIDED if hasattr(Notification.Type, "SALE_VOIDED") else Notification.Type.SALE_MADE,
            message=f"Sale #{sale.id} voided.",
            sale_id=sale.id,
        )

    return sale