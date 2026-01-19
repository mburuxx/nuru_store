from .models import Inventory

def reorder_point(inv: Inventory) -> int:
    if inv.reorder_level is None:
        return 0
    return (inv.reorder_level * inv.reorder_threshold_percent + 99) // 100

def is_low_stock(inv: Inventory) -> bool:
    rp = reorder_point(inv)
    return rp > 0 and inv.quantity <= rp