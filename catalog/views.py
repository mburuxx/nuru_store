from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsCashier, IsOwner

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    CategoryTreeSerializer,
    ProductBulkUpsertSerializer,
    ProductReadSerializer,
    ProductWriteSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    - CASHIER/OWNER can read
    - OWNER can create/update/deactivate
    """
    queryset = Category.objects.all().select_related("parent").order_by("name")
    serializer_class = CategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "activate", "deactivate"]:
            return [IsOwner()]
        return [IsAuthenticated(), IsCashier()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        is_owner = user.is_superuser or getattr(getattr(user, "profile", None), "role", None) == "OWNER"

        is_active = self.request.query_params.get("is_active")
        if is_active in ("0", "1"):
            qs = qs.filter(is_active=(is_active == "1"))
        else:
            if not is_owner:
                qs = qs.filter(is_active=True)

        return qs

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        """
        Returns a nested tree of active categories (top-level roots).
        """
        roots = Category.objects.filter(parent__isnull=True, is_active=True).order_by("name")
        data = CategoryTreeSerializer(roots, many=True).data
        return Response(data)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = True
        obj.save(update_fields=["is_active"])
        return Response({"message": "Category activated."})

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response({"message": "Category deactivated."})


class ProductViewSet(viewsets.ModelViewSet):
    """
    - CASHIER/OWNER can list/retrieve/sku lookup
    - OWNER can create/update/deactivate/activate/bulk
    """
    queryset = Product.objects.all().order_by("name")
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "sku"]
    ordering_fields = ["name", "created_at", "updated_at", "selling_price"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in [
            "create", "update", "partial_update", "destroy",
            "activate", "deactivate", "bulk",
        ]:
            return [IsOwner()]
        return [IsAuthenticated(), IsCashier()]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update", "bulk"]:
            return ProductWriteSerializer
        return ProductReadSerializer

    def get_queryset(self):
        qs = Product.objects.select_related("category","inventory")

        user = self.request.user
        is_owner = user.is_superuser or getattr(getattr(user, "profile", None), "role", None) == "OWNER"

        is_active = self.request.query_params.get("is_active")
        if is_active in ("0", "1"):
            qs = qs.filter(is_active=(is_active == "1"))
        else:
            if not is_owner:
                qs = qs.filter(is_active=True)

        category_id = self.request.query_params.get("category")
        category_slug = self.request.query_params.get("category_slug")

        if category_id:
            qs = qs.filter(category_id=category_id)

        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        return qs

    @action(detail=False, methods=["get"], url_path=r"sku/(?P<sku>[^/]+)")
    def by_sku(self, request, sku=None):
        """
        Cashier scan flow: GET /api/catalog/products/sku/<sku>/
        """
        qs = self.get_queryset()
        obj = get_object_or_404(qs, sku=sku)
        serializer = ProductReadSerializer(obj, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = True
        obj.save(update_fields=["is_active"])
        return Response({"message": "Product activated."})

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response({"message": "Product deactivated."})

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """
        OWNER-only bulk upsert:
        POST /api/catalog/products/bulk/
        Body:
        {
          "items": [
            {"sku":"123", "name":"Milk", "selling_price":"60.00", "cost_price":"45.00", "is_active": true, "category_id": 1},
            ...
          ]
        }
        """
        bulk_serializer = ProductBulkUpsertSerializer(data=request.data)
        bulk_serializer.is_valid(raise_exception=True)
        items = bulk_serializer.validated_data["items"]

        created = 0
        updated = 0

        with transaction.atomic():
            for item in items:
                sku = item["sku"]
                defaults = {
                    "name": item.get("name"),
                    "selling_price": item.get("selling_price"),
                    "cost_price": item.get("cost_price"),
                    "is_active": item.get("is_active", True),
                    "category": item.get("category"),
                }

                obj, was_created = Product.objects.update_or_create(sku=sku, defaults=defaults)
                if was_created:
                    created += 1
                else:
                    updated += 1

        return Response(
            {"message": "Bulk upsert complete.", "created": created, "updated": updated},
            status=status.HTTP_200_OK,
        )