from django.contrib import admin
from .models import Account, Notification

admin.site.register(Account)
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "message", "created_at", "is_read")