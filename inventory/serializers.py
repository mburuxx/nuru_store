from rest_framework import serializers
from catalog.models import Product

from .models import Inventory, StockMovement


class ProductMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "sku", "selling_price", "is_active"]


class InventoryReadSerializer(serializers.ModelSerializer):
    product = ProductMiniSerializer(read_only=True)
    reorder_point = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = [
            "id",
            "product",
            "quantity",
            "reorder_threshold_percent",
            "reorder_level",
            "reorder_point",
            "low_stock_flag",
            "updated_at",
        ]

    def get_reorder_point(self, obj):
        """
        Practical rule:
        - If reorder_level is set => reorder point = ceil(reorder_level * percent / 100)
        - Else fallback reorder point = 0 (meaning: you haven't configured reorder rules yet)
        """
        if obj.reorder_level is None:
            return 0
        # ceiling without importing math
        return (obj.reorder_level * obj.reorder_threshold_percent + 99) // 100


class InventoryUpdateSerializer(serializers.ModelSerializer):
    """
    Owner can update reorder config; NOT quantity directly (use ops endpoints).
    """
    class Meta:
        model = Inventory
        fields = ["reorder_threshold_percent", "reorder_level"]


class StockMovementReadSerializer(serializers.ModelSerializer):
    product = ProductMiniSerializer(read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "movement_type",
            "direction",
            "quantity",
            "sale",
            "notes",
            "created_by_username",
            "created_at",
        ]


class StockOpBaseSerializer(serializers.Serializer):
    """
    Used by supply/adjust/return endpoints.
    You can identify a product either by sku or product_id.
    """
    sku = serializers.CharField(required=False, allow_blank=False)
    product_id = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        sku = attrs.get("sku")
        product_id = attrs.get("product_id")

        if not sku and not product_id:
            raise serializers.ValidationError("Provide either sku or product_id.")

        if sku and product_id:
            raise serializers.ValidationError("Provide only one: sku OR product_id.")

        if sku:
            try:
                product = Product.objects.get(sku=sku)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"sku": "Product with this SKU not found."})
        else:
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"product_id": "Product not found."})

        if not product.is_active:
            raise serializers.ValidationError("Product is inactive.")

        attrs["product"] = product
        return attrs


class StockAdjustSerializer(StockOpBaseSerializer):
    direction = serializers.ChoiceField(choices=StockMovement.Direction.choices)

    # movement_type is fixed in the view: ADJUSTMENT


class SetReorderSerializer(serializers.Serializer):
    sku = serializers.CharField(required=False)
    product_id = serializers.IntegerField(required=False)

    reorder_level = serializers.IntegerField(min_value=0, required=True)
    reorder_threshold_percent = serializers.IntegerField(min_value=1, max_value=100, required=True)

    def validate(self, attrs):
        sku = attrs.get("sku")
        product_id = attrs.get("product_id")
        if not sku and not product_id:
            raise serializers.ValidationError("Provide either sku or product_id.")
        if sku and product_id:
            raise serializers.ValidationError("Provide only one: sku OR product_id.")

        if sku:
            try:
                product = Product.objects.get(sku=sku)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"sku": "Product with this SKU not found."})
        else:
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"product_id": "Product not found."})

        attrs["product"] = product
        return attrs
