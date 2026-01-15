from django.urls import path
from .views import SaleCreateAPIView, SaleDetailAPIView

urlpatterns = [
    path("sales/", SaleCreateAPIView.as_view(), name="sale-create"),
    path("sales/<int:pk>/", SaleDetailAPIView.as_view(), name="sale-detail"),
]