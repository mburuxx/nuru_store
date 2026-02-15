from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Sale
from .serializers import SaleCreateSerializer, SaleDetailSerializer, AddPaymentSerializer
from .services import create_sale, InsufficientStock, void_sale, AlreadyVoided, add_payment
from users.permissions import IsCashier,  IsOwner

class SaleCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def post(self, request):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        v = serializer.validated_data

        try:
            sale = create_sale(
                cashier=request.user,
                payment_type=v["payment_type"],
                payment_method=v.get("payment_method"),
                amount_paid=v.get("amount_paid"),
                due_date=v.get("due_date"),
                customer_name=v.get("customer_name", ""),
                customer_phone=v.get("customer_phone", ""),
                items=v["items"],
            )
        except InsufficientStock as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleDetailSerializer(sale).data, status=status.HTTP_201_CREATED)
class SaleDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    queryset = Sale.objects.prefetch_related("items__product", "payments").select_related("receipt", "invoice", "cashier")
    serializer_class = SaleDetailSerializer

class SaleListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    serializer_class = SaleDetailSerializer

    def get_queryset(self):
        qs = Sale.objects.prefetch_related("items__product", "payments").select_related("receipt", "invoice", "cashier")

        status_q = self.request.query_params.get("status")
        cashier_id = self.request.query_params.get("cashier_id")
        date_from = self.request.query_params.get("date_from")  
        date_to = self.request.query_params.get("date_to")     

        if status_q:
            qs = qs.filter(status=status_q)
        if cashier_id:
            qs = qs.filter(cashier_id=cashier_id)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        user = self.request.user
        is_owner = user.is_superuser or getattr(getattr(user, "profile", None), "role", None) == "OWNER"
        if not is_owner:
            qs = qs.filter(cashier=user)

        return qs


class SaleVoidAPIView(APIView):
    """
    OWNER-only by default (safe).
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request, sale_id: int):
        notes = request.data.get("notes", "")
        try:
            sale = void_sale(sale_id=sale_id, voided_by=request.user, notes=notes)
        except Sale.DoesNotExist:
            return Response({"detail": "Sale not found."}, status=status.HTTP_404_NOT_FOUND)
        except AlreadyVoided as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleDetailSerializer(sale).data, status=status.HTTP_200_OK)
    
class SaleAddPaymentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def post(self, request, sale_id: int):
        s = AddPaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        try:
            sale = add_payment(
                sale_id=sale_id,
                received_by=request.user,
                method=s.validated_data["method"],
                amount=s.validated_data["amount"],
                reference=s.validated_data.get("reference", ""),
            )
        except Sale.DoesNotExist:
            return Response({"detail": "Sale not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleDetailSerializer(sale).data, status=status.HTTP_200_OK)