from django.urls import path

from .views import (
    NotificationListAPIView,
    NotificationMarkAllReadAPIView,
    NotificationMarkReadAPIView,
    NotificationUnreadCountAPIView,
)

urlpatterns = [
    path("", NotificationListAPIView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountAPIView.as_view(), name="notification-unread-count"),
    path("<int:pk>/", NotificationMarkReadAPIView.as_view(), name="notification-mark-read"),
    path("mark-all-read/", NotificationMarkAllReadAPIView.as_view(), name="notification-mark-all-read"),
]