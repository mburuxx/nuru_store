from datetime import datetime
from django.utils import timezone
from django.db.models import Max

from .models import Receipt


def generate_receipt_number(prefix="RCPT"):
    year = datetime.now().year
    last = Receipt.objects.filter(receipt_number__startswith=f"{prefix}-{year}-").aggregate(
        max_num=Max("receipt_number")
    )["max_num"]

    if not last:
        next_seq = 1
    else:
        next_seq = int(last.split("-")[-1]) + 1

    return f"{prefix}-{year}-{next_seq:06d}"

def generate_invoice_number(prefix="INV"):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d-%H%M%S-%f')}"