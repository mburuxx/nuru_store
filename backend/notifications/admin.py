from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("type", "recipient", "is_read", "created_at", "message")
    list_filter = ("type", "is_read")
    search_fields = ("message", "recipient__username")