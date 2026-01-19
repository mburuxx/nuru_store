from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "message",
            "is_read",
            "product_id",
            "sale_id",
            "created_at",
        ]


class NotificationMarkReadSerializer(serializers.Serializer):
    is_read = serializers.BooleanField()