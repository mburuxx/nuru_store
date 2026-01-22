# inventory/utils.py
from .models import Inventory


DEFAULT_LOW_STOCK_QTY = 10


def reorder_point(inv: Inventory) -> int:
    """
    Returns the quantity threshold below which stock is considered LOW.

    Rules:
    - If reorder_level is set (> 0), use percentage of that level.
      Example: level=300, percent=10 => 30
    - If reorder_level is NOT set, fallback to DEFAULT_LOW_STOCK_QTY (10).
    """

    level = inv.reorder_level
    percent = inv.reorder_threshold_percent

    # Fallback: simple rule (qty <= 10)
    if level is None or level <= 0:
        return DEFAULT_LOW_STOCK_QTY

    try:
        level = int(level)
        percent = int(percent)
    except (TypeError, ValueError):
        return DEFAULT_LOW_STOCK_QTY

    # Guardrails
    if percent < 1:
        percent = 1
    if percent > 100:
        percent = 100

    # Ceil(level * percent / 100)
    return (level * percent + 99) // 100


def is_low_stock(inv: Inventory) -> bool:
    """
    True if inventory quantity is at or below its reorder point.
    """
    rp = reorder_point(inv)
    return inv.quantity <= rp