from rest_framework import serializers
from catalog.models import Product

from .models import Inventory, StockMovement
from .utils import reorder_point

class ProductMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "sku", "cost_price", "selling_price", "is_active"]


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
        return reorder_point(obj)

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

    new_cp = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    new_sp = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

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

        if "new_cp" in attrs and attrs["new_cp"] is not None:
            if attrs["new_cp"] < 0:
                raise serializers.ValidationError({"new_cp": "Must be >= 0."})


        if "new_sp" in attrs and attrs["new_sp"] is not None:
            if attrs["new_sp"] < 0:
                raise serializers.ValidationError({"new_sp": "Must be >= 0."})
        
        return attrs


class StockAdjustSerializer(StockOpBaseSerializer):
    direction = serializers.ChoiceField(choices=StockMovement.Direction.choices)

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
