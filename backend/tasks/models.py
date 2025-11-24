from django.db import models
from users.models import Account, Notification
from datetime import datetime, time
from django.utils import timezone

# Create your models here.

class Task(models.Model):
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="tasks")
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=200, blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    priority = models.CharField(max_length=200)
    status = models.CharField(max_length=200, default='in_progress') #'completed', 'overdue', or 'in_progress'
    completed_at = models.DateTimeField(blank=True, null=True)
    notify = models.BooleanField(default=True) # New field: whether the user wants notifications for this task (default: enabled)


class WeeklyChallenge(models.Model):
    """
    Represents a weekly challenge that is shared across all users.
    Challenges reset every week (Sunday to Saturday).
    """
    task_count = models.IntegerField(help_text="Number of tasks to complete")
    priority = models.CharField(max_length=20, choices=[
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High')
    ], help_text="Priority level of tasks to complete")
    description = models.CharField(max_length=500, help_text="Challenge description")
    start_date = models.DateTimeField(help_text="Challenge start date (Sunday 12:00 AM)")
    deadline = models.DateTimeField(help_text="Challenge deadline (Saturday 11:59 PM)")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.description} ({self.start_date.date()} - {self.deadline.date()})"


class ChallengeParticipation(models.Model):
    """
    Tracks which users have joined which challenges.
    Users who join a challenge and are friends form teams together.
    """
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="challenge_participations")
    challenge = models.ForeignKey(WeeklyChallenge, on_delete=models.CASCADE, related_name="participants")
    joined_at = models.DateTimeField(auto_now_add=True)
    # Track if the user has received their reward for completing this challenge
    reward_claimed = models.BooleanField(default=False)
    
    class Meta:
        # Ensure a user can only join a challenge once
        unique_together = ('user', 'challenge')
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.challenge.description}"
    
class Event(models.Model):
    name = models.CharField(max_length=200)
    start = models.DateTimeField(default=timezone.now)  # event start datetime
    end = models.DateTimeField(default=timezone.now)    # event end datetime
    reward_coins = models.IntegerField(default=100)
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    def has_ended(self):
        return timezone.now() >= self.end

    def end_event(self):
        if not self.is_active:
            return None  # already ended

        # Count completed tasks during event period
        task_counts = (
            Task.objects.filter(
                status="completed",
                completed_at__range=(self.start, self.end)
            )
            .values('user')
            .annotate(count=models.Count('id'))
            .order_by('-count', 'user')  # break ties consistently
        )

        if not task_counts:
            self.is_active = False
            self.save()
            return None

        winner_id = task_counts[0]['user']
        winner = Account.objects.get(id=winner_id)
        winner.coins += self.reward_coins
        winner.save()

        # Notification
        Notification.objects.create(
            user=winner,
            message=f"Congratulations! You won the event '{self.name}' and earned {self.reward_coins} coins!"
        )

        self.is_active = False
        self.save()
        return winner