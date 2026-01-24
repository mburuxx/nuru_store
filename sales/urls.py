from django.urls import path

from .views import SaleCreateAPIView, SaleDetailAPIView, SaleListAPIView, SaleVoidAPIView, SaleAddPaymentAPIView

urlpatterns = [
    path("", SaleListAPIView.as_view(), name="sale-list"),                # GET /api/sales/
    path("create/", SaleCreateAPIView.as_view(), name="sale-create"),     # POST /api/sales/create/
    path("<int:pk>/", SaleDetailAPIView.as_view(), name="sale-detail"),   # GET /api/sales/<id>/
    path("<int:sale_id>/void/", SaleVoidAPIView.as_view(), name="sale-void"),  # POST /api/sales/<id>/void/
    path("<int:sale_id>/payments/", SaleAddPaymentAPIView.as_view(), name="sale-add-payment"),
]