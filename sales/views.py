from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Sale
from .serializers import SaleCreateSerializer, SaleDetailSerializer
from .services import create_sale, InsufficientStock


class SaleCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]
    queryset = Sale.objects.prefetch_related("items__product").select_related("receipt")
    serializer_class = SaleDetailSerializer