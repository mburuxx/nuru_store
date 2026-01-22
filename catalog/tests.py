from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.db import IntegrityError, transaction

from rest_framework.test import APIClient

from users.models import UserProfile
from catalog.models import Category, Product
from inventory.models import Inventory


User = get_user_model()


class CatalogMinimalTests(TestCase):
    BASE = "/api/catalog" 

    def setUp(self):
        self.client = APIClient()

        # users
        self.cashier = User.objects.create_user(username="cash", password="pass1234")
        self.cashier.profile.role = UserProfile.Role.CASHIER
        self.cashier.profile.save()

        self.owner = User.objects.create_user(username="own", password="pass1234")
        self.owner.profile.role = UserProfile.Role.OWNER
        self.owner.profile.save()

        self.superuser = User.objects.create_superuser(
            username="boss", password="pass1234", email="boss@example.com"
        )

    # Category model (slugging)
    def test_category_slug_autogenerates_and_uniquifies(self):
        c1 = Category.objects.create(name="Office Supplies")
        self.assertEqual(c1.slug, "office-supplies")

        c2 = Category.objects.create(name="Office-Supplies")
        self.assertEqual(c2.slug, "office-supplies-2")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Category.objects.create(name="Office Supplies")

    # Category API behaviors
    def test_category_permissions_cashier_cannot_create_owner_can(self):
        payload = {"name": "Electronics", "parent": None, "is_active": True}

        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(f"{self.BASE}/categories/", payload, format="json")
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"{self.BASE}/categories/", payload, format="json")
        self.assertEqual(res.status_code, 201)

    def test_category_list_default_active_only_for_cashier(self):
        Category.objects.create(name="ActiveCat", is_active=True)
        Category.objects.create(name="InactiveCat", is_active=False)

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/categories/")
        self.assertEqual(res.status_code, 200)
        names = [c["name"] for c in res.data["results"]]
        self.assertIn("ActiveCat", names)
        self.assertNotIn("InactiveCat", names)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"{self.BASE}/categories/")
        self.assertEqual(res.status_code, 200)
        names = [c["name"] for c in res.data["results"]]
        self.assertIn("ActiveCat", names)
        self.assertIn("InactiveCat", names)

    def test_category_tree_returns_only_active_nested_children(self):
        root = Category.objects.create(name="Root", is_active=True)
        child_active = Category.objects.create(name="ChildA", parent=root, is_active=True)
        Category.objects.create(name="ChildB", parent=root, is_active=False)

        # any authenticated cashier can read tree
        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/categories/tree/")
        self.assertEqual(res.status_code, 200)

        # should include Root, and only active child
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "Root")
        children = res.data[0]["children"]
        self.assertEqual([c["name"] for c in children], ["ChildA"])

        # sanity: active child is returned
        self.assertEqual(children[0]["id"], child_active.id)

    # Product signals/serializers
    def test_product_creation_creates_inventory_and_quantity_defaults(self):
        p = Product.objects.create(
            name="Mouse",
            sku="M-001",
            selling_price=Decimal("500.00"),
            cost_price=Decimal("300.00"),
            is_active=True,
        )
        inv = Inventory.objects.filter(product=p).first()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.quantity, 0)

        # Ensure API returns quantity field and default 0
        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/products/{p.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["quantity"], 0)

    def test_cost_price_hidden_for_cashier_visible_for_owner(self):
        p = Product.objects.create(
            name="Keyboard",
            sku="K-001",
            selling_price=Decimal("1200.00"),
            cost_price=Decimal("800.00"),
            is_active=True,
        )

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/products/{p.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["cost_price"])

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"{self.BASE}/products/{p.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data["cost_price"]), Decimal("800.00"))

        self.client.force_authenticate(user=self.superuser)
        res = self.client.get(f"{self.BASE}/products/{p.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data["cost_price"]), Decimal("800.00"))

    # Product API behaviors
    def test_products_list_default_active_only_for_cashier(self):
        Product.objects.create(
            name="ActiveP",
            sku="A-1",
            selling_price=Decimal("10.00"),
            cost_price=Decimal("5.00"),
            is_active=True,
        )
        Product.objects.create(
            name="InactiveP",
            sku="I-1",
            selling_price=Decimal("10.00"),
            cost_price=Decimal("5.00"),
            is_active=False,
        )

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(f"{self.BASE}/products/")
        self.assertEqual(res.status_code, 200)
        names = [p["name"] for p in res.data["results"]]
        self.assertIn("ActiveP", names)
        self.assertNotIn("InactiveP", names)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"{self.BASE}/products/")
        self.assertEqual(res.status_code, 200)
        names = [p["name"] for p in res.data["results"]]
        self.assertIn("ActiveP", names)
        self.assertIn("InactiveP", names)

    def test_by_sku_endpoint_uses_filtered_queryset(self):
        active = Product.objects.create(
            name="Milk",
            sku="MILK1",
            selling_price=Decimal("60.00"),
            cost_price=Decimal("45.00"),
            is_active=True,
        )
        Product.objects.create(
            name="Hidden",
            sku="HID1",
            selling_price=Decimal("60.00"),
            cost_price=Decimal("45.00"),
            is_active=False,
        )

        self.client.force_authenticate(user=self.cashier)

        res = self.client.get(f"{self.BASE}/products/sku/{active.sku}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["sku"], "MILK1")

        # cashier should not be able to fetch inactive by sku (404 due to filtered queryset)
        res = self.client.get(f"{self.BASE}/products/sku/HID1/")
        self.assertEqual(res.status_code, 404)

    def test_product_create_owner_only_and_sku_validation(self):
        cat = Category.objects.create(name="Food", is_active=True)

        payload_blank = {
            "category_id": cat.id,
            "name": "Bread",
            "sku": "   ",  # invalid
            "selling_price": "50.00",
            "cost_price": "30.00",
            "is_active": True,
        }

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"{self.BASE}/products/", payload_blank, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("sku", res.data)

        payload_ok = dict(payload_blank)
        payload_ok["sku"] = " BR-001 " 
        res = self.client.post(f"{self.BASE}/products/", payload_ok, format="json")
        self.assertEqual(res.status_code, 201)

        p = Product.objects.get(id=res.data["id"])
        self.assertEqual(p.sku, "BR-001")

        # cashier cannot create
        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(f"{self.BASE}/products/", payload_ok, format="json")
        self.assertEqual(res.status_code, 403)

    def test_bulk_upsert_owner_only_counts_created_updated(self):
        cat = Category.objects.create(name="BulkCat", is_active=True)

        existing = Product.objects.create(
            name="OldName",
            sku="B-001",
            selling_price=Decimal("10.00"),
            cost_price=Decimal("7.00"),
            is_active=True,
            category=cat,
        )

        items = {
            "items": [
                {
                    "sku": "B-001", 
                    "name": "NewName",
                    "selling_price": "12.00",
                    "cost_price": "8.00",
                    "is_active": True,
                    "category_id": cat.id,
                },
                {
                    "sku": "B-002",
                    "name": "Created",
                    "selling_price": "20.00",
                    "cost_price": "15.00",
                    "is_active": True,
                    "category_id": cat.id,
                },
            ]
        }

        # cashier forbidden
        self.client.force_authenticate(user=self.cashier)
        res = self.client.post(f"{self.BASE}/products/bulk/", items, format="json")
        self.assertEqual(res.status_code, 403)

        # owner allowed
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"{self.BASE}/products/bulk/", items, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["created"], 1)
        self.assertEqual(res.data["updated"], 1)

        existing.refresh_from_db()
        self.assertEqual(existing.name, "NewName")
        self.assertEqual(existing.selling_price, Decimal("12.00"))

        created = Product.objects.get(sku="B-002")
        # inventory should be created by signal
        self.assertTrue(Inventory.objects.filter(product=created).exists())