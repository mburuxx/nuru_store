from django.urls import path
from .views import ProductListAPIView, CategoryListAPIView

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    path("products/", ProductListAPIView.as_view(), name="product-list"),
]