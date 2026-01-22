import os
import django
import json
from decimal import Decimal

# 1. Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings') # CHANGE 'nuru_store' to your actual project folder name
django.setup()

from catalog.models import Category, Product
from inventory.models import StockMovement, Inventory
from django.contrib.auth import get_user_model

User = get_user_model()

# 2. Define Data (Paste your JSON content into these variables or load from files)
CATEGORIES_DATA = [
  { "name": "Electronics", "parent": None },
  { "name": "Fashion & Clothing", "parent": None },
  { "name": "Groceries & Essentials", "parent": None },
  { "name": "Home & Living", "parent": None },
  { "name": "Health & Beauty", "parent": None },
  { "name": "Smartphones & Tablets", "parent": "Electronics" }, 
  { "name": "Laptops & Computers", "parent": "Electronics" },
  { "name": "Men's Wear", "parent": "Fashion & Clothing" },
  { "name": "Women's Footwear", "parent": "Fashion & Clothing" },
  { "name": "Fresh Produce", "parent": "Groceries & Essentials" },
  { "name": "Beverages", "parent": "Groceries & Essentials" },
  { "name": "Furniture", "parent": "Home & Living" },
  { "name": "Kitchenware", "parent": "Home & Living" },
  { "name": "Skincare", "parent": "Health & Beauty" },
  { "name": "Pharmacy", "parent": "Health & Beauty" }
]

# Note: I mapped parent to "Names" instead of IDs to make it robust
PRODUCTS_DATA = [
  {"name": "Samsung Galaxy S23", "sku": "PHN-SAM-001", "selling_price": "95000.00", "cost_price": "85000.00", "category_name": "Smartphones & Tablets"},
  {"name": "iPhone 14 Pro", "sku": "PHN-APP-002", "selling_price": "145000.00", "cost_price": "130000.00", "category_name": "Smartphones & Tablets"},
  {"name": "Google Pixel 7", "sku": "PHN-GGL-003", "selling_price": "75000.00", "cost_price": "65000.00", "category_name": "Smartphones & Tablets"},
  {"name": "Tecno Camon 20", "sku": "PHN-TEC-004", "selling_price": "28000.00", "cost_price": "22000.00", "category_name": "Smartphones & Tablets"},
  {"name": "Infinix Note 30", "sku": "PHN-INF-005", "selling_price": "25000.00", "cost_price": "20000.00", "category_name": "Smartphones & Tablets"},
  {"name": "Samsung A54", "sku": "PHN-SAM-006", "selling_price": "45000.00", "cost_price": "38000.00", "category_name": "Smartphones & Tablets"},
  {"name": "Nokia G21", "sku": "PHN-NOK-007", "selling_price": "18000.00", "cost_price": "14000.00", "category_name": "Smartphones & Tablets"},
  {"name": "iPad Air 5th Gen", "sku": "TAB-APP-008", "selling_price": "80000.00", "cost_price": "72000.00", "category_name": "Smartphones & Tablets"},

  {"name": "HP Pavilion 15", "sku": "LAP-HP-001", "selling_price": "65000.00", "cost_price": "55000.00", "category_name": "Laptops & Computers"},
  {"name": "MacBook Air M2", "sku": "LAP-APP-002", "selling_price": "160000.00", "cost_price": "145000.00", "category_name": "Laptops & Computers"},
  {"name": "Dell XPS 13", "sku": "LAP-DEL-003", "selling_price": "150000.00", "cost_price": "135000.00", "category_name": "Laptops & Computers"},
  {"name": "Lenovo ThinkPad X1", "sku": "LAP-LEN-004", "selling_price": "140000.00", "cost_price": "120000.00", "category_name": "Laptops & Computers"},
  {"name": "Asus ZenBook", "sku": "LAP-ASU-005", "selling_price": "90000.00", "cost_price": "80000.00", "category_name": "Laptops & Computers"},
  {"name": "Logitech Wireless Mouse", "sku": "ACC-LOG-006", "selling_price": "2500.00", "cost_price": "1500.00", "category_name": "Laptops & Computers"},
  {"name": "Sandisk 1TB SSD", "sku": "ACC-SAN-007", "selling_price": "12000.00", "cost_price": "9000.00", "category_name": "Laptops & Computers"},
  {"name": "USB-C Hub Multiport", "sku": "ACC-GEN-008", "selling_price": "4500.00", "cost_price": "3000.00", "category_name": "Laptops & Computers"},

  {"name": "Men's Slim Fit Jeans", "sku": "CLO-MN-001", "selling_price": "2500.00", "cost_price": "1500.00", "category_name": "Men's Wear"},
  {"name": "Cotton Polo Shirt", "sku": "CLO-MN-002", "selling_price": "1200.00", "cost_price": "800.00", "category_name": "Men's Wear"},
  {"name": "Formal White Shirt", "sku": "CLO-MN-003", "selling_price": "1800.00", "cost_price": "1100.00", "category_name": "Men's Wear"},
  {"name": "Leather Jacket", "sku": "CLO-MN-004", "selling_price": "4500.00", "cost_price": "3000.00", "category_name": "Men's Wear"},
  {"name": "Casual Chinos", "sku": "CLO-MN-005", "selling_price": "2200.00", "cost_price": "1400.00", "category_name": "Men's Wear"},
  {"name": "Sports Shorts", "sku": "CLO-MN-006", "selling_price": "900.00", "cost_price": "500.00", "category_name": "Men's Wear"},
  {"name": "Graphic T-Shirt", "sku": "CLO-MN-007", "selling_price": "800.00", "cost_price": "400.00", "category_name": "Men's Wear"},
  {"name": "Denim Jacket", "sku": "CLO-MN-008", "selling_price": "3000.00", "cost_price": "1800.00", "category_name": "Men's Wear"},

  {"name": "Running Sneakers", "sku": "SHO-WN-001", "selling_price": "3500.00", "cost_price": "2200.00", "category_name": "Women's Footwear"},
  {"name": "Leather Ankle Boots", "sku": "SHO-WN-002", "selling_price": "4500.00", "cost_price": "3200.00", "category_name": "Women's Footwear"},
  {"name": "Summer Sandals", "sku": "SHO-WN-003", "selling_price": "1500.00", "cost_price": "900.00", "category_name": "Women's Footwear"},
  {"name": "High Heels Black", "sku": "SHO-WN-004", "selling_price": "2800.00", "cost_price": "1600.00", "category_name": "Women's Footwear"},
  {"name": "Canvas Slip-ons", "sku": "SHO-WN-005", "selling_price": "1200.00", "cost_price": "700.00", "category_name": "Women's Footwear"},
  {"name": "Sport Walking Shoes", "sku": "SHO-WN-006", "selling_price": "2500.00", "cost_price": "1500.00", "category_name": "Women's Footwear"},
  {"name": "Formal Flats", "sku": "SHO-WN-007", "selling_price": "1800.00", "cost_price": "1100.00", "category_name": "Women's Footwear"},
  {"name": "Winter Boots", "sku": "SHO-WN-008", "selling_price": "5000.00", "cost_price": "3500.00", "category_name": "Women's Footwear"},

  {"name": "Organic Bananas (kg)", "sku": "GRO-FRT-001", "selling_price": "150.00", "cost_price": "100.00", "category_name": "Fresh Produce"},
  {"name": "Red Apples (kg)", "sku": "GRO-FRT-002", "selling_price": "250.00", "cost_price": "180.00", "category_name": "Fresh Produce"},
  {"name": "Potatoes (kg)", "sku": "GRO-VEG-003", "selling_price": "100.00", "cost_price": "60.00", "category_name": "Fresh Produce"},
  {"name": "Onions (kg)", "sku": "GRO-VEG-004", "selling_price": "120.00", "cost_price": "70.00", "category_name": "Fresh Produce"},
  {"name": "Tomatoes (kg)", "sku": "GRO-VEG-005", "selling_price": "140.00", "cost_price": "80.00", "category_name": "Fresh Produce"},
  {"name": "Carrots (kg)", "sku": "GRO-VEG-006", "selling_price": "90.00", "cost_price": "50.00", "category_name": "Fresh Produce"},
  {"name": "Spinach Bunch", "sku": "GRO-VEG-007", "selling_price": "50.00", "cost_price": "20.00", "category_name": "Fresh Produce"},
  {"name": "Avocados (pc)", "sku": "GRO-FRT-008", "selling_price": "40.00", "cost_price": "20.00", "category_name": "Fresh Produce"},

  {"name": "Mineral Water 500ml", "sku": "BEV-WAT-001", "selling_price": "50.00", "cost_price": "30.00", "category_name": "Beverages"},
  {"name": "Orange Juice 1L", "sku": "BEV-JUI-002", "selling_price": "300.00", "cost_price": "220.00", "category_name": "Beverages"},
  {"name": "Cola Soda 2L", "sku": "BEV-SOD-003", "selling_price": "180.00", "cost_price": "140.00", "category_name": "Beverages"},
  {"name": "Energy Drink 250ml", "sku": "BEV-NRG-004", "selling_price": "150.00", "cost_price": "100.00", "category_name": "Beverages"},
  {"name": "Premium Coffee 250g", "sku": "BEV-COF-005", "selling_price": "550.00", "cost_price": "400.00", "category_name": "Beverages"},
  {"name": "Green Tea Box", "sku": "BEV-TEA-006", "selling_price": "350.00", "cost_price": "250.00", "category_name": "Beverages"},
  {"name": "Oat Milk 1L", "sku": "BEV-MLK-007", "selling_price": "400.00", "cost_price": "300.00", "category_name": "Beverages"},
  {"name": "Sparkling Water 1L", "sku": "BEV-WAT-008", "selling_price": "120.00", "cost_price": "80.00", "category_name": "Beverages"},

  {"name": "Office Chair Ergonomic", "sku": "HOM-FUR-001", "selling_price": "8500.00", "cost_price": "6000.00", "category_name": "Furniture"},
  {"name": "Wooden Coffee Table", "sku": "HOM-FUR-002", "selling_price": "4500.00", "cost_price": "3000.00", "category_name": "Furniture"},
  {"name": "Bookshelf 5-Tier", "sku": "HOM-FUR-003", "selling_price": "5500.00", "cost_price": "4000.00", "category_name": "Furniture"},
  {"name": "Bedside Lamp", "sku": "HOM-FUR-004", "selling_price": "1500.00", "cost_price": "900.00", "category_name": "Furniture"},
  {"name": "Bean Bag Chair", "sku": "HOM-FUR-005", "selling_price": "3500.00", "cost_price": "2500.00", "category_name": "Furniture"},
  {"name": "Shoe Rack", "sku": "HOM-FUR-006", "selling_price": "2000.00", "cost_price": "1200.00", "category_name": "Furniture"},
  {"name": "Full Length Mirror", "sku": "HOM-FUR-007", "selling_price": "3000.00", "cost_price": "1800.00", "category_name": "Furniture"},
  {"name": "Dining Chair Set (4)", "sku": "HOM-FUR-008", "selling_price": "12000.00", "cost_price": "9500.00", "category_name": "Furniture"},

  {"name": "Non-Stick Frying Pan", "sku": "KIT-COO-001", "selling_price": "1500.00", "cost_price": "1000.00", "category_name": "Kitchenware"},
  {"name": "Chef's Knife 8-inch", "sku": "KIT-KNI-002", "selling_price": "2200.00", "cost_price": "1500.00", "category_name": "Kitchenware"},
  {"name": "Blender 500W", "sku": "KIT-APP-003", "selling_price": "4500.00", "cost_price": "3500.00", "category_name": "Kitchenware"},
  {"name": "Glass Food Containers", "sku": "KIT-STO-004", "selling_price": "1800.00", "cost_price": "1200.00", "category_name": "Kitchenware"},
  {"name": "Stainless Steel Pot", "sku": "KIT-COO-005", "selling_price": "3000.00", "cost_price": "2000.00", "category_name": "Kitchenware"},
  {"name": "Electric Kettle", "sku": "KIT-APP-006", "selling_price": "2500.00", "cost_price": "1800.00", "category_name": "Kitchenware"},
  {"name": "Chopping Board", "sku": "KIT-ACC-007", "selling_price": "800.00", "cost_price": "400.00", "category_name": "Kitchenware"},
  {"name": "Dinner Plate Set (6)", "sku": "KIT-DIN-008", "selling_price": "3500.00", "cost_price": "2200.00", "category_name": "Kitchenware"},

  {"name": "Moisturizing Lotion", "sku": "HNB-SKN-001", "selling_price": "1200.00", "cost_price": "800.00", "category_name": "Skincare"},
  {"name": "Sunscreen SPF 50", "sku": "HNB-SKN-002", "selling_price": "1800.00", "cost_price": "1200.00", "category_name": "Skincare"},
  {"name": "Face Wash Gel", "sku": "HNB-SKN-003", "selling_price": "900.00", "cost_price": "500.00", "category_name": "Skincare"},
  {"name": "Vitamin C Serum", "sku": "HNB-SKN-004", "selling_price": "2500.00", "cost_price": "1500.00", "category_name": "Skincare"},
  {"name": "Body Scrub", "sku": "HNB-SKN-005", "selling_price": "1500.00", "cost_price": "900.00", "category_name": "Skincare"},
  {"name": "Lip Balm Pack", "sku": "HNB-SKN-006", "selling_price": "500.00", "cost_price": "250.00", "category_name": "Skincare"},
  {"name": "Anti-Aging Cream", "sku": "HNB-SKN-007", "selling_price": "3500.00", "cost_price": "2200.00", "category_name": "Skincare"},
  {"name": "Aloe Vera Gel", "sku": "HNB-SKN-008", "selling_price": "800.00", "cost_price": "450.00", "category_name": "Skincare"},

  {"name": "Pain Relief Tablets", "sku": "PHA-MED-001", "selling_price": "300.00", "cost_price": "150.00", "category_name": "Pharmacy"},
  {"name": "Vitamin C Supplements", "sku": "PHA-VIT-002", "selling_price": "1200.00", "cost_price": "800.00", "category_name": "Pharmacy"},
  {"name": "First Aid Kit", "sku": "PHA-KIT-003", "selling_price": "2500.00", "cost_price": "1800.00", "category_name": "Pharmacy"},
  {"name": "Bandages Pack", "sku": "PHA-ACC-004", "selling_price": "200.00", "cost_price": "100.00", "category_name": "Pharmacy"},
  {"name": "Cough Syrup", "sku": "PHA-MED-005", "selling_price": "600.00", "cost_price": "400.00", "category_name": "Pharmacy"},
  {"name": "Digital Thermometer", "sku": "PHA-DEV-006", "selling_price": "1500.00", "cost_price": "900.00", "category_name": "Pharmacy"},
  {"name": "Hand Sanitizer 500ml", "sku": "PHA-HYG-007", "selling_price": "500.00", "cost_price": "300.00", "category_name": "Pharmacy"},
  {"name": "Face Masks (50pcs)", "sku": "PHA-HYG-008", "selling_price": "800.00", "cost_price": "400.00", "category_name": "Pharmacy"}
]
def run():
    print("--- Starting Import ---")
    
    # A. Create Categories
    print("Creating Categories...")
    cat_map = {} # Store name: object mapping
    
    # 1. Create Parents first
    for data in CATEGORIES_DATA:
        if data['parent'] is None:
            cat, created = Category.objects.get_or_create(name=data['name'])
            cat_map[cat.name] = cat
            
    # 2. Create Children
    for data in CATEGORIES_DATA:
        if data['parent'] is not None:
            parent_obj = cat_map.get(data['parent'])
            cat, created = Category.objects.get_or_create(name=data['name'], defaults={'parent': parent_obj})
            cat_map[cat.name] = cat

    # B. Create Products & Ensure Inventory Exists
    print("Creating Products...")
    admin_user = User.objects.filter(is_superuser=True).first()
    
    for p_data in PRODUCTS_DATA:
        cat_obj = cat_map.get(p_data['category_name'])
        
        prod, created = Product.objects.get_or_create(
            sku=p_data['sku'],
            defaults={
                'name': p_data['name'],
                'selling_price': Decimal(p_data['selling_price']),
                'cost_price': Decimal(p_data['cost_price']),
                'category': cat_obj
            }
        )
        
        # CRITICAL: Ensure Inventory object exists so the signal doesn't fail
        # Usually handled by a Product post_save signal, but we do it manually here just in case
        Inventory.objects.get_or_create(product=prod)

        # C. Add Initial Stock (Triggers your Signal)
        # We only add stock if it's a newly created product or we want to force it
        if created: 
            StockMovement.objects.create(
                product=prod,
                movement_type="SUPPLY",
                direction="IN",
                quantity=50, # Defaulting 50 for all test items
                notes="Initial Seed Data",
                created_by=admin_user
            )

    print("--- Import Complete! ---")

if __name__ == '__main__':
    run()