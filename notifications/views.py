from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer, NotificationMarkReadSerializer


class NotificationListAPIView(generics.ListAPIView):
    """
    List current user's notifications.
    Filters:
      ?unread=1
      ?type=SALE_MADE
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)

        unread = self.request.query_params.get("unread")
        notif_type = self.request.query_params.get("type")

        if unread in ("1", "true", "True"):
            qs = qs.filter(is_read=False)

        if notif_type:
            qs = qs.filter(type=notif_type)

        return qs


class NotificationUnreadCountAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()

        return Response({"unread_count": count})


class NotificationMarkReadAPIView(APIView):
    """
    Mark one notification read/unread.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int):
        try:
            notif = Notification.objects.get(id=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        notif.is_read = serializer.validated_data["is_read"]
        notif.save(update_fields=["is_read"])

        return Response(NotificationSerializer(notif).data)


class NotificationMarkAllReadAPIView(APIView):
    """
    Mark all notifications as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        return Response({"message": f"{updated} notifications marked as read."})