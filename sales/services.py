from decimal import Decimal
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from catalog.models import Product
from inventory.models import Inventory, StockMovement
from notifications.models import Notification
from .models import Sale, SaleItem, Receipt, Invoice, Payment
from .utils import generate_receipt_number

class InsufficientStock(Exception):
    pass

@transaction.atomic
def create_sale(
    *,
    cashier,
    payment_type: str,
    payment_method: str | None = None,
    amount_paid: Decimal | None = None,
    due_date=None,
    customer_name: str = "",
    customer_phone: str = "",
    items: list[dict],
    receipt_prefix="RCPT",
) -> Sale:
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

    # -----------------------------
    # ✅ PAYMENT NORMALIZATION FIXES
    # -----------------------------
    if payment_type == Sale.PaymentType.PAY_NOW:
        if not payment_method:
            raise ValueError("payment_method is required for PAY_NOW.")
        # fully paid unless caller explicitly gave a value
        if amount_paid is None:
            amount_paid = subtotal

    elif payment_type == Sale.PaymentType.CREDIT:
        if due_date is None:
            raise ValueError("due_date is required for CREDIT.")
        if amount_paid is None:
            amount_paid = Decimal("0.00")
        if amount_paid > Decimal("0.00") and not payment_method:
            raise ValueError("payment_method is required when amount_paid > 0.")

    else:
        raise ValueError("Invalid payment_type.")

    payment_status = (
        Sale.PaymentStatus.PAID if amount_paid >= subtotal
        else Sale.PaymentStatus.PARTIAL if amount_paid > Decimal("0.00")
        else Sale.PaymentStatus.UNPAID
    )

    sale = Sale.objects.create(
        cashier=cashier,
        payment_type=payment_type,
        payment_method=payment_method,      # can be null for CREDIT w/ 0 paid
        amount_paid=amount_paid,
        due_date=due_date,
        customer_name=customer_name,
        customer_phone=customer_phone,
        subtotal=subtotal,
        discount=Decimal("0.00"),
        total=subtotal,
        payment_status=payment_status,
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

        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.SALE,
            direction=StockMovement.Direction.OUT,
            quantity=qty,
            created_by=cashier,
            sale=sale,
            notes=f"Sale #{sale.id}",
        )

    # ✅ Only issue receipt if fully paid
    if payment_status == Sale.PaymentStatus.PAID:
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

    # ✅ If CREDIT, issue invoice
    if payment_type == Sale.PaymentType.CREDIT:
        Invoice.objects.create(
            sale=sale,
            due_date=due_date,
            status=Invoice.Status.PAID if payment_status == Sale.PaymentStatus.PAID else Invoice.Status.OPEN,
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

def add_payment(*, sale_id: int, received_by, method: str, amount: Decimal, reference: str = "") -> Sale:
    """
    Record a payment for a sale (typically CREDIT or PARTIAL).
    - Creates Payment row
    - Updates Sale.amount_paid + payment_status + payment_method (optional)
    - If fully paid: closes invoice + generates receipt (if missing)
    """
    if amount is None:
        raise ValueError("Amount is required.")
    if amount <= Decimal("0.00"):
        raise ValueError("Amount must be greater than 0.")

    with transaction.atomic():
        sale = (
            Sale.objects
            .select_for_update()
            .select_related("receipt", "invoice")
            .get(id=sale_id)
        )

        if sale.status == Sale.Status.VOIDED:
            raise ValueError("Cannot pay a voided sale.")

        # If already paid, block extra payments
        if sale.payment_status == Sale.PaymentStatus.PAID:
            raise ValueError("This sale is already fully paid.")

        balance = sale.total - sale.amount_paid
        if balance <= Decimal("0.00"):
            # safety net
            sale.payment_status = Sale.PaymentStatus.PAID
            sale.save(update_fields=["payment_status"])
            raise ValueError("This sale is already fully paid.")

        if amount > balance:
            raise ValueError(f"Amount exceeds balance due ({balance}).")

        # 1) Create payment record
        Payment.objects.create(
            sale=sale,
            method=method,
            amount=amount,
            reference=reference or "",
            received_by=received_by,
        )

        # 2) Update sale aggregates
        sale.amount_paid = sale.amount_paid + amount

        # If you want to keep "last used method", store it here.
        sale.payment_method = method

        new_balance = sale.total - sale.amount_paid
        if new_balance <= Decimal("0.00"):
            sale.payment_status = Sale.PaymentStatus.PAID
        elif sale.amount_paid > Decimal("0.00"):
            sale.payment_status = Sale.PaymentStatus.PARTIAL
        else:
            sale.payment_status = Sale.PaymentStatus.UNPAID

        sale.save(update_fields=["amount_paid", "payment_method", "payment_status"])

        # 3) If paid: close invoice (if exists) + ensure receipt exists
        if sale.payment_status == Sale.PaymentStatus.PAID:
            inv = getattr(sale, "invoice", None)
            if inv:
                inv.status = Invoice.Status.PAID
                inv.save(update_fields=["status"])

            # Create receipt only if missing
            if not getattr(sale, "receipt", None):
                Receipt.objects.create(
                    sale=sale,
                    receipt_number=generate_receipt_number(sale.id),
                )

        return sale


def _generate_receipt_number(sale_id: int) -> str:
    # Simple, deterministic-ish format. You can replace with your existing format.
    # Example: RCP-20260124-000123
    today = timezone.now().strftime("%Y%m%d")
    return f"RCP-{today}-{sale_id:06d}"