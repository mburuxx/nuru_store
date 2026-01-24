from django.urls import path

from .views import SaleCreateAPIView, SaleDetailAPIView, SaleListAPIView, SaleVoidAPIView, SaleAddPaymentAPIView

urlpatterns = [
    path("", SaleListAPIView.as_view(), name="sale-list"),               
    path("create/", SaleCreateAPIView.as_view(), name="sale-create"),    
    path("<int:pk>/", SaleDetailAPIView.as_view(), name="sale-detail"),  
    path("<int:sale_id>/void/", SaleVoidAPIView.as_view(), name="sale-void"), 
    path("<int:sale_id>/payments/", SaleAddPaymentAPIView.as_view(), name="sale-add-payment"),
]