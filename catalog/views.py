from rest_framework import generics
from .models import Product, Category
from .serializers import ProductListSerializer, CategorySerializer

class CategoryListAPIView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True).select_related("parent")
    serializer_class = CategorySerializer

class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = Product.objects.select_related("inventory", "category").all()

        category_id = self.request.query_params.get("category")
        category_slug = self.request.query_params.get("category_slug")

        if category_id:
            qs = qs.filter(category_id=category_id)

        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        return qs