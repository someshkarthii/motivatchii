from django.contrib import admin

from .models import Task, Event

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "category", "priority", "deadline", "status", "notify")

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "start", "end", "reward_coins", "is_active")
