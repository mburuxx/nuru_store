from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsCashier, IsOwner

from .models import Inventory, StockMovement
from .serializers import (
    InventoryReadSerializer,
    InventoryUpdateSerializer,
    SetReorderSerializer,
    StockAdjustSerializer,
    StockMovementReadSerializer,
    StockOpBaseSerializer,
)


class InventoryListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    serializer_class = InventoryReadSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["product__name", "product__sku"]
    ordering_fields = ["updated_at", "quantity"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        qs = Inventory.objects.select_related("product").order_by("-updated_at")
        low_stock = self.request.query_params.get("low_stock")
        if low_stock in ("1", "true", "True"):
            qs = qs.filter(low_stock_flag=True)
        return qs


class InventoryDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    serializer_class = InventoryReadSerializer
    queryset = Inventory.objects.select_related("product")


class InventoryUpdateAPIView(generics.UpdateAPIView):
    """
    Owner updates reorder settings only.
    """
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = InventoryUpdateSerializer
    queryset = Inventory.objects.select_related("product")


class StockMovementListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    serializer_class = StockMovementReadSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at", "quantity"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = StockMovement.objects.select_related("product", "created_by").all()

        sku = self.request.query_params.get("sku")
        movement_type = self.request.query_params.get("movement_type")
        direction = self.request.query_params.get("direction")

        if sku:
            qs = qs.filter(product__sku=sku)
        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        if direction:
            qs = qs.filter(direction=direction)

        return qs


class SupplyStockAPIView(APIView):
    """
    OWNER: Stock IN with movement_type=SUPPLY
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request):
        s = StockOpBaseSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        product = s.validated_data["product"]
        qty = s.validated_data["quantity"]
        notes = s.validated_data.get("notes", "")

        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.SUPPLY,
            direction=StockMovement.Direction.IN,
            quantity=qty,
            created_by=request.user,
            notes=notes,
        )
        return Response({"message": "Supply recorded."}, status=status.HTTP_201_CREATED)


class AdjustStockAPIView(APIView):
    """
    OWNER: Adjustment IN/OUT with movement_type=ADJUSTMENT
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request):
        s = StockAdjustSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        product = s.validated_data["product"]
        qty = s.validated_data["quantity"]
        direction = s.validated_data["direction"]
        notes = s.validated_data.get("notes", "")

        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.ADJUSTMENT,
            direction=direction,
            quantity=qty,
            created_by=request.user,
            notes=notes,
        )
        return Response({"message": "Adjustment recorded."}, status=status.HTTP_201_CREATED)


class ReturnStockAPIView(APIView):
    """
    Default: allow cashier + owner to record returns IN.
    If you want OWNER-only, change IsCashier -> IsOwner.
    """
    permission_classes = [IsAuthenticated, IsCashier]

    def post(self, request):
        s = StockOpBaseSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        product = s.validated_data["product"]
        qty = s.validated_data["quantity"]
        notes = s.validated_data.get("notes", "")

        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.MovementType.RETURN,
            direction=StockMovement.Direction.IN,
            quantity=qty,
            created_by=request.user,
            notes=notes,
        )
        return Response({"message": "Return recorded."}, status=status.HTTP_201_CREATED)


class SetReorderAPIView(APIView):
    """
    OWNER: set reorder rules by sku/product_id.
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request):
        s = SetReorderSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        product = s.validated_data["product"]
        inv, _ = Inventory.objects.get_or_create(product=product)

        inv.reorder_level = s.validated_data["reorder_level"]
        inv.reorder_threshold_percent = s.validated_data["reorder_threshold_percent"]

        # re-evaluate low stock flag
        # reorder point = ceil(reorder_level * percent/100)
        reorder_point = (inv.reorder_level * inv.reorder_threshold_percent + 99) // 100
        inv.low_stock_flag = (reorder_point > 0 and inv.quantity <= reorder_point)

        inv.save(update_fields=["reorder_level", "reorder_threshold_percent", "low_stock_flag", "updated_at"])

        return Response({"message": "Reorder settings updated."}, status=status.HTTP_200_OK)