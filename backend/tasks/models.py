from django.db import models
from users.models import Account

# Create your models here.

class Task(models.Model):
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="tasks")
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=200, blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    priority = models.CharField(max_length=200)
    status = models.CharField(max_length=200, default='in_progress') #'completed', 'overdue', or 'in_progress'
    completed_at = models.DateTimeField(blank=True, null=True)