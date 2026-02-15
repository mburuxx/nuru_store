from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import UserProfile
from catalog.models import Product
from inventory.models import Inventory, StockMovement
from notifications.models import Notification

from sales.models import Sale
from sales.services import create_sale, void_sale, InsufficientStock, AlreadyVoided


User = get_user_model()


class SalesMinimalTests(TestCase):
    BASE = "/api/sales" 
    def setUp(self):
        self.client = APIClient()

        self.cashier1 = User.objects.create_user(username="cash1", password="pass1234")
        self.cashier1.profile.role = UserProfile.Role.CASHIER
        self.cashier1.profile.save()

        self.cashier2 = User.objects.create_user(username="cash2", password="pass1234")
        self.cashier2.profile.role = UserProfile.Role.CASHIER
        self.cashier2.profile.save()

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

        StockMovement.objects.create(
            product=self.product,
            movement_type=StockMovement.MovementType.SUPPLY,
            direction=StockMovement.Direction.IN,
            quantity=50,
            created_by=self.owner,
            notes="seed",
        )
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 50)


    def test_create_sale_deducts_stock_creates_items_receipt_and_owner_notification(self):
        Notification.objects.all().delete()

        sale = create_sale(
            cashier=self.cashier1,
            payment_method=Sale.PaymentMethod.CASH,
            items=[{"product_id": self.product.id, "quantity": 2}],
        )

        sale.refresh_from_db()
        self.inv.refresh_from_db()

        self.assertEqual(self.inv.quantity, 48)

        self.assertEqual(sale.subtotal, Decimal("120.00"))
        self.assertEqual(sale.total, Decimal("120.00"))
        self.assertEqual(sale.status, Sale.Status.COMPLETED)

     
        self.assertEqual(sale.items.count(), 1)
        self.assertTrue(hasattr(sale, "receipt"))
        self.assertTrue(sale.receipt.receipt_number)  
        notifs = Notification.objects.filter(type=Notification.Type.SALE_MADE, sale_id=sale.id)
        self.assertEqual(notifs.count(), 1)
        self.assertEqual(notifs.first().recipient, self.owner)

    def test_create_sale_raises_insufficient_stock_and_does_not_change_quantity(self):
        before = self.inv.quantity
        with self.assertRaises(InsufficientStock):
            create_sale(
                cashier=self.cashier1,
                payment_method=Sale.PaymentMethod.CASH,
                items=[{"product_id": self.product.id, "quantity": 999}],
            )
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, before)

    def test_void_sale_restores_stock_and_marks_voided(self):
        sale = create_sale(
            cashier=self.cashier1,
            payment_method=Sale.PaymentMethod.CASH,
            items=[{"product_id": self.product.id, "quantity": 5}],
        )
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 45)

        sale = void_sale(sale_id=sale.id, voided_by=self.owner, notes="mistake")
        sale.refresh_from_db()
        self.inv.refresh_from_db()

        self.assertEqual(sale.status, Sale.Status.VOIDED)
        self.assertEqual(self.inv.quantity, 50)  # restored

        with self.assertRaises(AlreadyVoided):
            void_sale(sale_id=sale.id, voided_by=self.owner)

    def test_sale_create_api_cashier_allowed_returns_201_and_deducts_stock(self):
        self.client.force_authenticate(user=self.cashier1)

        res = self.client.post(
            f"{self.BASE}/create/",
            {"payment_method": "CASH", "items": [{"product_id": self.product.id, "quantity": 3}]},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 47)

        self.assertEqual(res.data["status"], "COMPLETED")
        self.assertEqual(Decimal(res.data["total"]), Decimal("180.00"))
        self.assertEqual(len(res.data["items"]), 1)
        self.assertIn("receipt", res.data)

    def test_sale_create_api_insufficient_stock_returns_400(self):
        self.client.force_authenticate(user=self.cashier1)

        res = self.client.post(
            f"{self.BASE}/create/",
            {"payment_method": "CASH", "items": [{"product_id": self.product.id, "quantity": 999}]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)

    def test_sale_void_api_owner_only(self):
        sale = create_sale(
            cashier=self.cashier1,
            payment_method=Sale.PaymentMethod.CASH,
            items=[{"product_id": self.product.id, "quantity": 2}],
        )
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 48)

        self.client.force_authenticate(user=self.cashier1)
        res = self.client.post(f"{self.BASE}/{sale.id}/void/", {"notes": "nope"}, format="json")
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"{self.BASE}/{sale.id}/void/", {"notes": "ok"}, format="json")
        self.assertEqual(res.status_code, 200)

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 50)
        self.assertEqual(res.data["status"], "VOIDED")

        res2 = self.client.post(f"{self.BASE}/{sale.id}/void/", {"notes": "again"}, format="json")
        self.assertEqual(res2.status_code, 400)

    def test_sale_list_visibility_cashier_sees_only_own_owner_sees_all(self):
        s1 = create_sale(
            cashier=self.cashier1,
            payment_method=Sale.PaymentMethod.CASH,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        s2 = create_sale(
            cashier=self.cashier2,
            payment_method=Sale.PaymentMethod.CASH,
            items=[{"product_id": self.product.id, "quantity": 1}],
        )

        self.client.force_authenticate(user=self.cashier1)
        res = self.client.get(f"{self.BASE}/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data["results"]]
        self.assertIn(s1.id, ids)
        self.assertNotIn(s2.id, ids)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"{self.BASE}/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data["results"]]
        self.assertIn(s1.id, ids)
        self.assertIn(s2.id, ids)