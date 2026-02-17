"""
Run this on Railway terminal:
  /opt/venv/bin/python populate_db.py
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from catalog.models import Category, Product
from inventory.models import Inventory, StockMovement

# ── CATEGORIES ──────────────────────────────────────────────────────────────

cat_data = {
    "Spare Parts": [
        "Engine Parts",
        "Brake Systems",
        "Electrical Parts",
        "Transmission Parts",
        "Suspension & Steering",
    ],
    "Vehicles": [
        "Motorcycles",
        "Trucks & Pickups",
        "Saloon Cars",
        "SUVs & 4WDs",
    ],
    "Household Items": [
        "Kitchen & Dining",
        "Bedding & Linen",
        "Cleaning Supplies",
        "Furniture",
    ],
    "Hardware": [
        "Hand Tools",
        "Power Tools",
        "Fasteners & Fixings",
        "Plumbing",
        "Paints & Adhesives",
    ],
    "Electronics": [
        "Mobile Phones & Accessories",
        "Home Appliances",
        "Computers & Laptops",
        "Audio & TV",
        "Cables & Adapters",
    ],
}

print("Creating categories...")
parent_map = {}
child_map = {}

for parent_name, children in cat_data.items():
    parent, _ = Category.objects.get_or_create(name=parent_name)
    parent_map[parent_name] = parent
    for child_name in children:
        child, _ = Category.objects.get_or_create(name=child_name, defaults={"parent": parent})
        child_map[child_name] = child

print(f"  {Category.objects.count()} categories ready.")

# ── PRODUCTS ─────────────────────────────────────────────────────────────────

products_data = [
    # Engine Parts
    ("Engine Oil Filter - Toyota", "SP-ENG-001", "Engine Parts", 450, 280),
    ("Timing Belt Kit - Nissan", "SP-ENG-002", "Engine Parts", 3200, 2100),
    ("Spark Plugs Set (4pcs) - NGK", "SP-ENG-003", "Engine Parts", 1200, 750),
    ("Air Filter - Universal", "SP-ENG-004", "Engine Parts", 650, 400),
    ("Fuel Pump - Toyota Corolla", "SP-ENG-005", "Engine Parts", 4500, 3000),
    ("Radiator Coolant 1L", "SP-ENG-006", "Engine Parts", 350, 200),

    # Brake Systems
    ("Brake Pads Front - Toyota", "SP-BRK-001", "Brake Systems", 1800, 1100),
    ("Brake Disc Rotor - Nissan", "SP-BRK-002", "Brake Systems", 3500, 2200),
    ("Brake Fluid DOT4 500ml", "SP-BRK-003", "Brake Systems", 450, 280),
    ("Brake Caliper - Universal", "SP-BRK-004", "Brake Systems", 5500, 3800),

    # Electrical Parts
    ("Car Battery 12V 60AH - Chloride", "SP-ELC-001", "Electrical Parts", 8500, 6000),
    ("Alternator - Toyota Hilux", "SP-ELC-002", "Electrical Parts", 12000, 8500),
    ("Starter Motor - Nissan", "SP-ELC-003", "Electrical Parts", 9500, 6800),
    ("Headlight Bulb H4 (2pcs)", "SP-ELC-004", "Electrical Parts", 650, 400),
    ("Fuse Box - Universal", "SP-ELC-005", "Electrical Parts", 1200, 800),

    # Transmission Parts
    ("Clutch Kit - Toyota", "SP-TRN-001", "Transmission Parts", 8500, 5800),
    ("Gear Oil 85W90 1L", "SP-TRN-002", "Transmission Parts", 550, 350),
    ("CV Joint - Universal", "SP-TRN-003", "Transmission Parts", 4500, 3000),

    # Suspension & Steering
    ("Shock Absorber Front - Toyota", "SP-SUS-001", "Suspension & Steering", 4500, 2900),
    ("Ball Joint - Nissan", "SP-SUS-002", "Suspension & Steering", 2200, 1400),
    ("Tie Rod End - Universal", "SP-SUS-003", "Suspension & Steering", 1800, 1100),
    ("Power Steering Fluid 1L", "SP-SUS-004", "Suspension & Steering", 400, 250),

    # Motorcycles
    ("Honda CB125 Engine Oil", "VH-MTC-001", "Motorcycles", 500, 320),
    ("Motorcycle Chain & Sprocket Kit", "VH-MTC-002", "Motorcycles", 2200, 1400),
    ("Motorcycle Tyre 2.75-17", "VH-MTC-003", "Motorcycles", 2800, 1900),
    ("Motorcycle Battery 12V 5AH", "VH-MTC-004", "Motorcycles", 2500, 1700),

    # Trucks & Pickups
    ("Truck Tyre 7.50R16", "VH-TRK-001", "Trucks & Pickups", 18000, 13000),
    ("Pickup Bed Liner - Universal", "VH-TRK-002", "Trucks & Pickups", 8500, 5500),

    # Saloon Cars
    ("Car Floor Mats - Universal", "VH-SAL-001", "Saloon Cars", 1500, 900),
    ("Seat Cover Set - Leather", "VH-SAL-002", "Saloon Cars", 6500, 4200),
    ("Car Air Freshener Pack", "VH-SAL-003", "Saloon Cars", 350, 200),

    # SUVs & 4WDs
    ("4WD Mud Tyres 265/70R16", "VH-SUV-001", "SUVs & 4WDs", 22000, 16000),
    ("Roof Rack - Universal SUV", "VH-SUV-002", "SUVs & 4WDs", 12000, 8000),
    ("Snorkel Kit - Land Cruiser", "VH-SUV-003", "SUVs & 4WDs", 15000, 10500),

    # Kitchen & Dining
    ("Non-Stick Frying Pan 28cm", "HH-KIT-001", "Kitchen & Dining", 1200, 750),
    ("Stainless Steel Sufuria 5L", "HH-KIT-002", "Kitchen & Dining", 950, 600),
    ("Dinner Plate Set (6pcs)", "HH-KIT-003", "Kitchen & Dining", 1800, 1100),
    ("Kettle Electric 1.5L", "HH-KIT-004", "Kitchen & Dining", 2200, 1500),
    ("Chopping Board - Wooden", "HH-KIT-005", "Kitchen & Dining", 450, 280),
    ("Thermos Flask 1L", "HH-KIT-006", "Kitchen & Dining", 850, 550),

    # Bedding & Linen
    ("Bedsheet Set - King Size", "HH-BED-001", "Bedding & Linen", 2500, 1600),
    ("Pillow (2pcs)", "HH-BED-002", "Bedding & Linen", 1200, 750),
    ("Blanket - Heavy Duty", "HH-BED-003", "Bedding & Linen", 3500, 2300),
    ("Mosquito Net - Double Bed", "HH-BED-004", "Bedding & Linen", 800, 500),

    # Cleaning Supplies
    ("Mop & Bucket Set", "HH-CLN-001", "Cleaning Supplies", 950, 600),
    ("Detergent Powder 2kg - Omo", "HH-CLN-002", "Cleaning Supplies", 550, 380),
    ("Bleach 1L - Jik", "HH-CLN-003", "Cleaning Supplies", 120, 75),
    ("Broom - Heavy Duty", "HH-CLN-004", "Cleaning Supplies", 350, 220),
    ("Dishwashing Liquid 500ml", "HH-CLN-005", "Cleaning Supplies", 180, 110),

    # Furniture
    ("Plastic Chair - Heavy Duty", "HH-FRN-001", "Furniture", 850, 550),
    ("Folding Table - 6ft", "HH-FRN-002", "Furniture", 4500, 3000),
    ("Shoe Rack - 3 Tier", "HH-FRN-003", "Furniture", 1500, 950),

    # Hand Tools
    ("Hammer 500g", "HW-HND-001", "Hand Tools", 650, 400),
    ("Screwdriver Set (10pcs)", "HW-HND-002", "Hand Tools", 850, 550),
    ("Pliers Combination 8\"", "HW-HND-003", "Hand Tools", 550, 350),
    ("Tape Measure 5m", "HW-HND-004", "Hand Tools", 350, 220),
    ("Hacksaw Frame + Blade", "HW-HND-005", "Hand Tools", 450, 280),
    ("Spirit Level 60cm", "HW-HND-006", "Hand Tools", 750, 480),
    ("Wrench Set (8pcs)", "HW-HND-007", "Hand Tools", 1800, 1150),

    # Power Tools
    ("Electric Drill 750W - Bosch", "HW-PWR-001", "Power Tools", 8500, 6000),
    ("Angle Grinder 4\" - Makita", "HW-PWR-002", "Power Tools", 6500, 4500),
    ("Circular Saw 1200W", "HW-PWR-003", "Power Tools", 9500, 6800),
    ("Jigsaw 500W", "HW-PWR-004", "Power Tools", 7500, 5200),

    # Fasteners & Fixings
    ("Wood Screws 3x30mm (100pcs)", "HW-FST-001", "Fasteners & Fixings", 150, 90),
    ("Masonry Nails 3\" (1kg)", "HW-FST-002", "Fasteners & Fixings", 220, 140),
    ("Bolts & Nuts Set M8 (50pcs)", "HW-FST-003", "Fasteners & Fixings", 350, 220),
    ("Wall Rawl Plugs (100pcs)", "HW-FST-004", "Fasteners & Fixings", 120, 75),

    # Plumbing
    ("PVC Pipe 1/2\" x 3m", "HW-PLB-001", "Plumbing", 350, 220),
    ("Ball Valve 1/2\"", "HW-PLB-002", "Plumbing", 250, 155),
    ("Pipe Wrench 14\"", "HW-PLB-003", "Plumbing", 950, 600),
    ("Teflon Tape (10pcs pack)", "HW-PLB-004", "Plumbing", 180, 110),
    ("Gate Valve 3/4\"", "HW-PLB-005", "Plumbing", 450, 280),

    # Paints & Adhesives
    ("Wall Paint 4L - White", "HW-PNT-001", "Paints & Adhesives", 1800, 1200),
    ("Wood Glue 250ml - Ponal", "HW-PNT-002", "Paints & Adhesives", 350, 220),
    ("Super Glue 3g (5pcs)", "HW-PNT-003", "Paints & Adhesives", 150, 90),
    ("Sandpaper Set (10pcs)", "HW-PNT-004", "Paints & Adhesives", 250, 155),

    # Mobile Phones & Accessories
    ("Phone Case - Samsung A55", "EL-MOB-001", "Mobile Phones & Accessories", 350, 200),
    ("Screen Protector - iPhone 15", "EL-MOB-002", "Mobile Phones & Accessories", 250, 150),
    ("USB-C Charging Cable 1m", "EL-MOB-003", "Mobile Phones & Accessories", 350, 200),
    ("Power Bank 20000mAh", "EL-MOB-004", "Mobile Phones & Accessories", 3500, 2300),
    ("Wireless Earbuds - Generic", "EL-MOB-005", "Mobile Phones & Accessories", 1500, 950),
    ("Phone Holder - Car Mount", "EL-MOB-006", "Mobile Phones & Accessories", 450, 280),

    # Home Appliances
    ("Electric Iron 1000W - Philips", "EL-APP-001", "Home Appliances", 2500, 1700),
    ("Standing Fan 18\" - Bruhm", "EL-APP-002", "Home Appliances", 4500, 3100),
    ("Rice Cooker 1.8L", "EL-APP-003", "Home Appliances", 3200, 2100),
    ("Blender 500W - Binatone", "EL-APP-004", "Home Appliances", 2800, 1900),
    ("Electric Kettle 1.7L - Ramtons", "EL-APP-005", "Home Appliances", 2200, 1500),

    # Computers & Laptops
    ("USB Flash Drive 64GB - SanDisk", "EL-CMP-001", "Computers & Laptops", 850, 550),
    ("Wireless Mouse - Logitech", "EL-CMP-002", "Computers & Laptops", 1800, 1200),
    ("USB Keyboard - Generic", "EL-CMP-003", "Computers & Laptops", 1200, 800),
    ("HDMI Cable 2m", "EL-CMP-004", "Computers & Laptops", 450, 280),
    ("Laptop Bag 15.6\"", "EL-CMP-005", "Computers & Laptops", 1500, 950),

    # Audio & TV
    ("Bluetooth Speaker - JBL Go", "EL-AUD-001", "Audio & TV", 3500, 2300),
    ("TV Remote - Universal", "EL-AUD-002", "Audio & TV", 350, 200),
    ("Headphones - Over Ear", "EL-AUD-003", "Audio & TV", 2200, 1500),
    ("AA Batteries (4pcs) - Energizer", "EL-AUD-004", "Audio & TV", 250, 155),

    # Cables & Adapters
    ("Extension Cable 5m - 4 Way", "EL-CBL-001", "Cables & Adapters", 850, 550),
    ("Multi Plug Adapter - Universal", "EL-CBL-002", "Cables & Adapters", 350, 220),
    ("RJ45 LAN Cable 5m", "EL-CBL-003", "Cables & Adapters", 550, 350),
    ("USB Hub 4-Port", "EL-CBL-004", "Cables & Adapters", 750, 480),
]

print("Creating products and inventory...")
created = 0
skipped = 0

for name, sku, cat_name, selling_price, cost_price in products_data:
    category = child_map.get(cat_name)

    product, was_created = Product.objects.get_or_create(
        sku=sku,
        defaults={
            "name": name,
            "category": category,
            "selling_price": selling_price,
            "cost_price": cost_price,
            "is_active": True,
        },
    )

    if was_created:
        # Create inventory record with stock
        inventory, _ = Inventory.objects.get_or_create(
            product=product,
            defaults={"quantity": 50, "reorder_level": 10},
        )

        # Create a SUPPLY stock movement
        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.SUPPLY,
            direction=StockMovement.Direction.IN,
            quantity=50,
            unit_cost=cost_price,
            unit_sp=selling_price,
            notes="Initial stock",
        )
        created += 1
    else:
        skipped += 1

print(f"  Products created: {created}")
print(f"  Products skipped (already exist): {skipped}")
print(f"  Total products in DB: {Product.objects.count()}")
print(f"  Total inventory records: {Inventory.objects.count()}")
print("\nDone! Database populated successfully.")