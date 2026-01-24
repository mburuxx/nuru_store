from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, F, DecimalField
from django.db.models.functions import TruncDay, TruncMonth
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsOwner, IsCashier
from sales.models import Sale, SaleItem
from inventory.models import Inventory, StockMovement
from notifications.models import Notification


def _date_range_from_query(request):
    """
    Supports:
      ?days=30   (default)
      OR ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    days = request.query_params.get("days")
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    now = timezone.now()

    if date_from and date_to:
        start = timezone.make_aware(timezone.datetime.fromisoformat(date_from + "T00:00:00"))
        end = timezone.make_aware(timezone.datetime.fromisoformat(date_to + "T23:59:59"))
        return start, end

    if days:
        try:
            days = int(days)
        except ValueError:
            days = 30
    else:
        days = 30

    start = now - timedelta(days=days)
    end = now
    return start, end


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        start, end = _date_range_from_query(request)

        sales_qs = Sale.objects.filter(created_at__range=(start, end), status=Sale.Status.COMPLETED)

        totals = sales_qs.aggregate(
            revenue=Sum("total"),
            sales_count=Count("id"),
        )
        revenue = totals["revenue"] or 0
        sales_count = totals["sales_count"] or 0
        avg_sale = (revenue / sales_count) if sales_count else 0

        low_stock_count = Inventory.objects.filter(low_stock_flag=True).count()
        out_of_stock_count = Inventory.objects.filter(quantity=0).count()

        unread_notifs = Notification.objects.filter(recipient=request.user, is_read=False).count()

        return Response({
            "range": {"from": start, "to": end},
            "revenue": str(revenue),
            "sales_count": sales_count,
            "avg_sale": str(avg_sale),
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "unread_notifications": unread_notifs,
        })


class SalesTrendAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        start, end = _date_range_from_query(request)
        period = request.query_params.get("period", "day") 

        qs = Sale.objects.filter(created_at__range=(start, end), status=Sale.Status.COMPLETED)

        trunc = TruncMonth("created_at") if period == "month" else TruncDay("created_at")

        rows = (
            qs.annotate(bucket=trunc)
              .values("bucket")
              .annotate(
                  revenue=Sum("total"),
                  count=Count("id"),
              )
              .order_by("bucket")
        )

        data = [{
            "bucket": r["bucket"],
            "revenue": str(r["revenue"] or 0),
            "count": r["count"],
        } for r in rows]

        return Response({
            "range": {"from": start, "to": end},
            "period": period,
            "data": data,
        })


class TopProductsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        start, end = _date_range_from_query(request)
        limit = request.query_params.get("limit", 10)
        try:
            limit = int(limit)
        except ValueError:
            limit = 10

        qs = SaleItem.objects.filter(
            sale__created_at__range=(start, end),
            sale__status=Sale.Status.COMPLETED,
        )

        rows = (
            qs.values("product_id", "product__name", "product__sku")
              .annotate(
                  qty=Sum("quantity"),
                  revenue=Sum("line_total"),
              )
              .order_by("-qty")[:limit]
        )

        return Response({
            "range": {"from": start, "to": end},
            "limit": limit,
            "data": [{
                "product_id": r["product_id"],
                "name": r["product__name"],
                "sku": r["product__sku"],
                "qty": r["qty"] or 0,
                "revenue": str(r["revenue"] or 0),
            } for r in rows]
        })


class CashierPerformanceAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        start, end = _date_range_from_query(request)

        qs = Sale.objects.filter(created_at__range=(start, end), status=Sale.Status.COMPLETED)

        rows = (
            qs.values("cashier_id", "cashier__username")
              .annotate(
                  sales_count=Count("id"),
                  revenue=Sum("total"),
              )
              .order_by("-revenue")
        )

        return Response({
            "range": {"from": start, "to": end},
            "data": [{
                "cashier_id": r["cashier_id"],
                "username": r["cashier__username"],
                "sales_count": r["sales_count"],
                "revenue": str(r["revenue"] or 0),
            } for r in rows]
        })


class InventoryHealthAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        total_skus = Inventory.objects.count()
        total_units = Inventory.objects.aggregate(total=Sum("quantity"))["total"] or 0

        low_stock_items = (
            Inventory.objects.select_related("product")
            .filter(low_stock_flag=True)
            .order_by("quantity")[:20]
        )

        out_of_stock_items = (
            Inventory.objects.select_related("product")
            .filter(quantity=0)
            .order_by("updated_at")[:20]
        )

        return Response({
            "total_skus": total_skus,
            "total_units": total_units,
            "low_stock_count": Inventory.objects.filter(low_stock_flag=True).count(),
            "out_of_stock_count": Inventory.objects.filter(quantity=0).count(),
            "low_stock_items": [{
                "product_id": inv.product_id,
                "sku": inv.product.sku,
                "name": inv.product.name,
                "quantity": inv.quantity,
                "updated_at": inv.updated_at,
            } for inv in low_stock_items],
            "out_of_stock_items": [{
                "product_id": inv.product_id,
                "sku": inv.product.sku,
                "name": inv.product.name,
                "quantity": inv.quantity,
                "updated_at": inv.updated_at,
            } for inv in out_of_stock_items],
        })


class RecentActivityAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        movements = (
            StockMovement.objects.select_related("product", "created_by")
            .order_by("-created_at")[:20]
        )

        notifs = (
            Notification.objects.filter(recipient=request.user)
            .order_by("-created_at")[:20]
        )

        return Response({
            "stock_movements": [{
                "id": m.id,
                "sku": m.product.sku,
                "product_name": m.product.name,
                "movement_type": m.movement_type,
                "direction": m.direction,
                "quantity": m.quantity,
                "sale_id": m.sale_id,
                "created_by": getattr(m.created_by, "username", None),
                "created_at": m.created_at,
            } for m in movements],
            "notifications": [{
                "id": n.id,
                "type": n.type,
                "message": n.message,
                "is_read": n.is_read,
                "product_id": n.product_id,
                "sale_id": n.sale_id,
                "created_at": n.created_at,
            } for n in notifs],
        })
    
from django.db.models import Sum, Count
from django.db.models.functions import TruncDay, TruncMonth

from users.permissions import IsCashier
from sales.models import Sale


class CashierSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def get(self, request):
        start, end = _date_range_from_query(request)

        qs = Sale.objects.filter(
            cashier=request.user,
            created_at__range=(start, end),
            status=Sale.Status.COMPLETED,
        )

        totals = qs.aggregate(
            revenue=Sum("total"),
            sales_count=Count("id"),
        )
        revenue = totals["revenue"] or 0
        sales_count = totals["sales_count"] or 0
        avg_sale = (revenue / sales_count) if sales_count else 0

        return Response({
            "range": {"from": start, "to": end},
            "revenue": str(revenue),
            "sales_count": sales_count,
            "avg_sale": str(avg_sale),
        })


class CashierSalesTrendAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def get(self, request):
        start, end = _date_range_from_query(request)
        period = request.query_params.get("period", "day") 

        qs = Sale.objects.filter(
            cashier=request.user,
            created_at__range=(start, end),
            status=Sale.Status.COMPLETED,
        )

        trunc = TruncMonth("created_at") if period == "month" else TruncDay("created_at")

        rows = (
            qs.annotate(bucket=trunc)
              .values("bucket")
              .annotate(
                  revenue=Sum("total"),
                  count=Count("id"),
              )
              .order_by("bucket")
        )

        return Response({
            "range": {"from": start, "to": end},
            "period": period,
            "data": [{
                "bucket": r["bucket"],
                "revenue": str(r["revenue"] or 0),
                "count": r["count"],
            } for r in rows],
        })


class CashierRecentSalesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def get(self, request):
        limit = request.query_params.get("limit", 20)
        try:
            limit = int(limit)
        except ValueError:
            limit = 20

        qs = (
            Sale.objects.filter(cashier=request.user)
            .select_related("receipt")
            .prefetch_related("items__product")
            .order_by("-created_at")[:limit]
        )

        from sales.serializers import SaleDetailSerializer
        return Response(SaleDetailSerializer(qs, many=True).data)
    

class CashierSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def get(self, request):
        start, end = _date_range_from_query(request)

        qs = Sale.objects.filter(
            cashier=request.user,
            created_at__range=(start, end),
            status=Sale.Status.COMPLETED,
        )

        totals = qs.aggregate(
            revenue=Sum("total"),
            sales_count=Count("id"),
        )
        revenue = totals["revenue"] or 0
        sales_count = totals["sales_count"] or 0
        avg_sale = (revenue / sales_count) if sales_count else 0

        return Response({
            "range": {"from": start, "to": end},
            "revenue": str(revenue),
            "sales_count": sales_count,
            "avg_sale": str(avg_sale),
        })


class CashierSalesTrendAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def get(self, request):
        start, end = _date_range_from_query(request)
        period = request.query_params.get("period", "day") 

        qs = Sale.objects.filter(
            cashier=request.user,
            created_at__range=(start, end),
            status=Sale.Status.COMPLETED,
        )

        trunc = TruncMonth("created_at") if period == "month" else TruncDay("created_at")

        rows = (
            qs.annotate(bucket=trunc)
              .values("bucket")
              .annotate(
                  revenue=Sum("total"),
                  count=Count("id"),
              )
              .order_by("bucket")
        )

        return Response({
            "range": {"from": start, "to": end},
            "period": period,
            "data": [{
                "bucket": r["bucket"],
                "revenue": str(r["revenue"] or 0),
                "count": r["count"],
            } for r in rows],
        })


class CashierRecentSalesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCashier]

    def get(self, request):
        limit = request.query_params.get("limit", 20)
        try:
            limit = int(limit)
        except ValueError:
            limit = 20

        qs = (
            Sale.objects.filter(cashier=request.user)
            .select_related("receipt")
            .prefetch_related("items__product")
            .order_by("-created_at")[:limit]
        )

        from sales.serializers import SaleDetailSerializer
        return Response(SaleDetailSerializer(qs, many=True).data)
