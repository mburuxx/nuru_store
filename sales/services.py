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
    # Use reorder_level if set, otherwise use threshold percent against a simple baseline assumption.
    # For now: if reorder_level exists use it; else if quantity <= 0 treat as low
    if inv.reorder_level is not None:
        return inv.quantity <= inv.reorder_level
    # Minimal fallback: treat <= 0 as low (Phase 4 will refine percent baseline)
    return inv.quantity <= 0


@transaction.atomic
def create_sale(*, cashier, payment_method: str, items: list[dict], receipt_prefix="RCPT") -> Sale:
    """
    items: [{ "product_id": int, "quantity": int }, ...]
    """
    # Lock inventories for involved products to prevent race conditions
    product_ids = [i["product_id"] for i in items]

    inventories = (
        Inventory.objects.select_for_update()
        .select_related("product")
        .filter(product_id__in=product_ids)
    )
    inv_map = {inv.product_id: inv for inv in inventories}

    # Validate + compute
    subtotal = Decimal("0.00")
    sale_items_to_create = []

    for i in items:
        pid = i["product_id"]
        qty = int(i["quantity"])

        inv = inv_map.get(pid)
        if not inv:
            raise ValueError(f"Inventory not found for product_id={pid}")

        if qty <= 0:
            raise ValueError("Quantity must be >= 1")

        if inv.quantity < qty:
            raise InsufficientStock(
                f"Insufficient stock for {inv.product.sku}. Have {inv.quantity}, need {qty}"
            )

        unit_price = inv.product.selling_price
        line_total = (unit_price * Decimal(qty)).quantize(Decimal("0.01"))

        subtotal += line_total

        sale_items_to_create.append((inv.product, qty, unit_price, line_total))

    # Create sale header
    sale = Sale.objects.create(
        cashier=cashier,
        payment_method=payment_method,
        subtotal=subtotal,
        discount=Decimal("0.00"),
        total=subtotal,
        status=Sale.Status.COMPLETED,
    )

    # Create sale items + deduct inventory + movements
    for product, qty, unit_price, line_total in sale_items_to_create:
        SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=qty,
            unit_price_snapshot=unit_price,
            line_total=line_total,
        )

        # Deduct inventory (safe, inside lock)
        Inventory.objects.filter(product=product).update(quantity=F("quantity") - qty)

        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.SALE,
            direction=StockMovement.Direction.OUT,
            quantity=qty,
            created_by=cashier,
            sale=sale,
            notes=f"Sale #{sale.id}",
        )

    # Refresh inventories to evaluate low-stock after deductions
    updated_inventories = Inventory.objects.filter(product_id__in=product_ids).select_related("product")

    # Create receipt
    receipt_no = generate_receipt_number(prefix=receipt_prefix)
    Receipt.objects.create(sale=sale, receipt_number=receipt_no)

    # Notify all owners
    owner_users = cashier.__class__.objects.filter(profile__role="OWNER", is_active=True)
    for owner in owner_users:
        Notification.objects.create(
            recipient=owner,
            type=Notification.Type.SALE_MADE,
            message=f"Sale #{sale.id} completed. Total: {sale.total}",
            sale_id=sale.id,
        )

    # Low stock notifications (crossing threshold only)
    for inv in updated_inventories:
        low = _is_low_stock(inv)

        if low and not inv.low_stock_flag:
            # mark flag
            Inventory.objects.filter(id=inv.id).update(low_stock_flag=True)
            for owner in owner_users:
                Notification.objects.create(
                    recipient=owner,
                    type=Notification.Type.LOW_STOCK,
                    message=f"Low stock: {inv.product.name} ({inv.product.sku}) qty={inv.quantity}",
                    product_id=inv.product_id,
                )
        elif (not low) and inv.low_stock_flag:
            # clear flag if restocked above threshold
            Inventory.objects.filter(id=inv.id).update(low_stock_flag=False)

    return sale