from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Sale
from .serializers import SaleCreateSerializer, SaleDetailSerializer
from .services import create_sale, InsufficientStock, void_sale, AlreadyVoided
from users.permissions import IsCashier,  IsOwner


class SaleCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def post(self, request):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            sale = create_sale(
                cashier=request.user,
                payment_method=serializer.validated_data["payment_method"],
                items=serializer.validated_data["items"],
            )
        except InsufficientStock as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(SaleDetailSerializer(sale).data, status=status.HTTP_201_CREATED)


class SaleDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    queryset = Sale.objects.prefetch_related("items__product").select_related("receipt")
    serializer_class = SaleDetailSerializer

class SaleListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsCashier]
    serializer_class = SaleDetailSerializer

    def get_queryset(self):
        qs = Sale.objects.prefetch_related("items__product").select_related("receipt", "cashier")

        # basic filters
        status_q = self.request.query_params.get("status")
        cashier_id = self.request.query_params.get("cashier_id")
        date_from = self.request.query_params.get("date_from")  # YYYY-MM-DD
        date_to = self.request.query_params.get("date_to")      # YYYY-MM-DD

        if status_q:
            qs = qs.filter(status=status_q)
        if cashier_id:
            qs = qs.filter(cashier_id=cashier_id)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        # if not owner, only show own sales
        user = self.request.user
        is_owner = user.is_superuser or getattr(getattr(user, "profile", None), "role", None) == "OWNER"
        if not is_owner:
            qs = qs.filter(cashier=user)

        return qs


class SaleVoidAPIView(APIView):
    """
    OWNER-only by default (safe).
    If you want cashiers to void their own sales, tell me and we’ll relax rules safely.
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