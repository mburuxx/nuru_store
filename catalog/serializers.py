from django.contrib.auth.models import AnonymousUser
from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "is_active", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]


class CategoryTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "is_active", "children"]

    def get_children(self, obj):
        qs = obj.children.filter(is_active=True).order_by("name")
        return CategoryTreeSerializer(qs, many=True).data


class ProductReadSerializer(serializers.ModelSerializer):
    quantity = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    cost_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "selling_price",
            "cost_price",      # shown only to OWNER/superuser
            "is_active",
            "quantity",
            "category",
            "created_at",
            "updated_at",
        ]

    def _is_owner(self, request):
        if not request or isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        return getattr(profile, "role", None) == "OWNER"

    def get_cost_price(self, obj):
        request = self.context.get("request")
        return obj.cost_price if self._is_owner(request) else None

    def get_quantity(self, obj):
        inv = getattr(obj, "inventory", None)
        return getattr(inv, "quantity", 0)


class ProductWriteSerializer(serializers.ModelSerializer):
    # write by ID, read will be nested on ProductReadSerializer
    category_id = serializers.PrimaryKeyRelatedField(
        source="category", queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "category_id",
            "name",
            "sku",
            "selling_price",
            "cost_price",
            "is_active",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            # Allow bulk upsert to submit existing SKUs
            "sku": {"validators": []},
        }

    def validate_sku(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("SKU is required.")
        return value


class ProductBulkUpsertSerializer(serializers.Serializer):
    """
    For quick bulk import/update:
    - If sku exists => update fields
    - If sku does not exist => create
    """
    items = ProductWriteSerializer(many=True)

    def create(self, validated_data):
        # Not used
        return validated_data

    def update(self, instance, validated_data):
        # Not used
        return validated_data