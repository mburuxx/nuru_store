from rest_framework import serializers
from .models import Sale, SaleItem, Receipt

class SaleItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class SaleCreateSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices)
    items = SaleItemCreateSerializer(many=True)

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SaleItem
        fields = ["id", "product_name", "sku", "quantity", "unit_price_snapshot", "line_total"]

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ["receipt_number", "generated_at"]

class SaleDetailSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    receipt = ReceiptSerializer(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id", "status", "payment_method",
            "subtotal", "discount", "total",
            "created_at", "items", "receipt"
        ]