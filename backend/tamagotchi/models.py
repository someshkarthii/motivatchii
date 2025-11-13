from django.db import models
from users.models import Account

MAX_HEALTH = 5.0

#Helper function for default unlocked outfits
def default_unlocked_outfits():
    return [1]

class Tamagotchi(models.Model):
    user = models.OneToOneField(Account, on_delete=models.CASCADE, related_name="tamagotchi")
    level = models.IntegerField(default=1)
    xp = models.IntegerField(default=0)
    health = models.FloatField(default=5.0)
    state = models.CharField(max_length=50, default="idle")
    outfit = models.IntegerField(default=1)  
    unlocked_outfits = models.JSONField(default=default_unlocked_outfits)  

    def __str__(self):
        return f"Tamagotchi: {self.user}"

    def increase_health(self, amount=1.0):
        self.health = min(self.health + amount, MAX_HEALTH)
        self.save()

    def decrease_health(self, amount=1.0):
        self.health = max(self.health - amount, 0)
        self.save()