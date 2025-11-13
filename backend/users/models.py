from django.db import models

# Create your models here.

class Account(models.Model):
    username = models.CharField(max_length=200, unique=True)
    hashed_password = models.CharField(max_length=200)
    coins = models.IntegerField(default=0)
    followers = models.JSONField(default=list) 
    following = models.JSONField(default=list) 

    def __str__(self):
        return self.username
    
class Notification(models.Model):
    """
    A simple model for storing user notifications — e.g., when someone follows you.
    """
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="notifications")
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}: {self.message}"