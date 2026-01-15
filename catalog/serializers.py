from rest_framework import serializers
from .models import Product, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "is_active"]

class ProductListSerializer(serializers.ModelSerializer):
    quantity = serializers.IntegerField(source="inventory.quantity", read_only=True)
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "selling_price", "is_active", "quantity", "category"]