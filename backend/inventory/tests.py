from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import UserProfile
from catalog.models import Product
from inventory.models import Inventory, StockMovement
from inventory.utils import reorder_point, is_low_stock
from notifications.models import Notification

User = get_user_model()


class InventoryMinimalTests(TestCase):
    BASE = "/api/inventory" 

    def setUp(self):
        self.client = APIClient()

        self.cashier = User.objects.create_user(username="cash", password="pass1234")
        self.cashier.profile.role = UserProfile.Role.CASHIER
        self.cashier.profile.save()

        self.owner = User.objects.create_user(username="own", password="pass1234")
        self.owner.profile.role = UserProfile.Role.OWNER
        self.owner.profile.save()

        self.product = Product.objects.create(
            name="Milk",
            sku="MILK-1",
            selling_price=Decimal("60.00"),
            cost_price=Decimal("45.00"),
            is_active=True,
        )
        self.inv = Inventory.objects.get(product=self.product)

    def test_reorder_point_fallback_and_percent_ceiling(self):
        self.inv.reorder_level = None
        self.inv.reorder_threshold_percent = 10
        self.inv.save()
        self.assertEqual(reorder_point(self.inv), 10)

        self.inv.reorder_level = 0
        self.inv.save()
        self.assertEqual(reorder_point(self.inv), 10)

        self.inv.reorder_level = 95
        self.inv.reorder_threshold_percent = 10
        self.inv.save()
        self.assertEqual(reorder_point(self.inv), 10)

    def test_is_low_stock_uses_reorder_point(self):
        self.inv.reorder_level = 100
        self.inv.reorder_threshold_percent = 10  # rp=10
        self.inv.quantity = 10
        self.inv.save()
        self.assertTrue(is_low_stock(self.inv))

        self.inv.quantity = 11
        self.inv.save()
        self.assertFalse(is_low_stock(self.inv))

    def test_stockmovement_increases_quantity_and_sets_low_stock_flag(self):
        self.inv.reorder_level = 100
        self.inv.reorder_threshold_percent = 10 
        self.inv.quantity = 0
        self.inv.low_stock_flag = False
        self.inv.save()

        StockMovement.objects.create(
            product=self.product,
            movement_type=StockMovement.MovementType.SUPPLY,
            direction=StockMovement.Direction.IN,
            quantity=20,
            created_by=self.owner,
        )

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 20)
        self.assertFalse(self.inv.low_stock_flag)

    def test_stockmovement_decreases_quantity_and_notifies_once_on_transition(self):
        self.inv.reorder_level = 100
        self.inv.reorder_threshold_percent = 10
        self.inv.quantity = 12
        self.inv.low_stock_flag = False
        self.inv.save()

        Notification.objects.all().delete()

        StockMovement.objects.create(
            product=self.product,
            movement_type=StockMovement.MovementType.SALE,
            direction=StockMovement.Direction.OUT,
            quantity=3,
            created_by=self.cashier,
        )

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 9)
        self.assertTrue(self.inv.low_stock_flag)

        notifs = Notification.objects.filter(type=Notification.Type.LOW_STOCK)
        self.assertEqual(notifs.count(), 1)
        self.assertEqual(notifs.first().recipient, self.owner)

        StockMovement.objects.create(
            product=self.product,
            movement_type=StockMovement.MovementType.SALE,
            direction=StockMovement.Direction.OUT,
            quantity=1,
            created_by=self.cashier,
        )
        self.assertEqual(
            Notification.objects.filter(type=Notification.Type.LOW_STOCK).count(),
            1,
        )

    def test_stockmovement_out_raises_when_insufficient_and_does_not_change_quantity(self):
        self.inv.quantity = 1
        self.inv.save()

        with self.assertRaises(ValueError):
            StockMovement.objects.create(
                product=self.product,
                movement_type=StockMovement.MovementType.SALE,
                direction=StockMovement.Direction.OUT,
                quantity=5,
                created_by=self.cashier,
            )

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 1)

    def test_inventory_list_requires_auth_and_cashier_can_read(self):
        res = self.client.get(f"{self.BASE}/items/")
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/items/")
        self.assertEqual(res.status_code, 200)

    def test_inventory_list_filters_low_stock_and_out_of_stock(self):
        self.inv.reorder_level = 100
        self.inv.reorder_threshold_percent = 10  
        self.inv.quantity = 0
        self.inv.low_stock_flag = True
        self.inv.save()

        self.client.force_authenticate(user=self.cashier)

        res = self.client.get(f"{self.BASE}/items/?low_stock=1")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["count"], 1)

        res = self.client.get(f"{self.BASE}/items/?out_of_stock=1")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_ops_supply_owner_only(self):
        payload = {"sku": self.product.sku, "quantity": 5, "notes": "restock"}

        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(f"{self.BASE}/ops/supply/", payload, format="json")
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"{self.BASE}/ops/supply/", payload, format="json")
        self.assertEqual(res.status_code, 201)

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 5)

    def test_ops_return_allows_cashier(self):
        payload = {"sku": self.product.sku, "quantity": 2, "notes": "customer return"}

        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(f"{self.BASE}/ops/return/", payload, format="json")
        self.assertEqual(res.status_code, 201)

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 2)

    def test_ops_adjust_owner_only_in_and_out(self):
        self.inv.quantity = 10
        self.inv.save()

        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(
            f"{self.BASE}/ops/adjust/",
            {"sku": self.product.sku, "quantity": 1, "direction": "IN"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"{self.BASE}/ops/adjust/",
            {"sku": self.product.sku, "quantity": 3, "direction": "OUT"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 7)

    def test_set_reorder_owner_only_sets_flag(self):
        self.inv.quantity = 9
        self.inv.low_stock_flag = False
        self.inv.save()

        payload = {"sku": self.product.sku, "reorder_level": 100, "reorder_threshold_percent": 10}  # rp=10

        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(f"{self.BASE}/ops/set-reorder/", payload, format="json")
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"{self.BASE}/ops/set-reorder/", payload, format="json")
        self.assertEqual(res.status_code, 200)

        self.inv.refresh_from_db()
        self.assertTrue(self.inv.low_stock_flag)
    
    def test_inventory_config_owner_only_recomputes_low_stock_and_notifies_once(self):
        self.inv.quantity = 15
        self.inv.low_stock_flag = False
        self.inv.reorder_level = None
        self.inv.reorder_threshold_percent = 10
        self.inv.save()

        Notification.objects.all().delete()

        url = f"{self.BASE}/items/{self.inv.id}/config/"
        payload = {"reorder_level": 100, "reorder_threshold_percent": 20}  

        self.client.force_authenticate(user=self.cashier)
        res = self.client.patch(url, payload, format="json")
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(url, payload, format="json")
        self.assertEqual(res.status_code, 200)

        self.inv.refresh_from_db()
        self.assertTrue(self.inv.low_stock_flag)

        notifs = Notification.objects.filter(type=Notification.Type.LOW_STOCK, product_id=self.product.id)
        self.assertEqual(notifs.count(), 1)
        self.assertEqual(notifs.first().recipient, self.owner)

        res = self.client.patch(url, payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            Notification.objects.filter(type=Notification.Type.LOW_STOCK, product_id=self.product.id).count(),
            1,
        )
    def test_inventory_read_serializer_reorder_point_matches_utils_fallback(self):
        self.inv.reorder_level = None
        self.inv.reorder_threshold_percent = 10
        self.inv.save()

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/items/{self.inv.id}/")
        self.assertEqual(res.status_code, 200)

        self.assertEqual(res.data["reorder_point"], 10)
