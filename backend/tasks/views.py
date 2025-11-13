
from rest_framework import viewsets, permissions
from .models import Task
from .serializers import TaskSerializer
from users.models import Account
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from tamagotchi.models import Tamagotchi
from django.utils import timezone
from datetime import timedelta
from collections import Counter


class TaskView(viewsets.ModelViewSet):


    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        user_id = self.request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")
        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")

        period = request.query_params.get('period', 'weekly')
        now = timezone.now()
        if period == 'monthly':
            start_date = now - timedelta(days=30)
            future_date = now + timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)
            future_date = now + timedelta(days=7)

        completed_tasks = Task.objects.filter(
            user=account,
            status='completed',
            completed_at__gte=start_date,
            completed_at__lte=now
        )
        missed_tasks = Task.objects.filter(
            user=account,
            status='overdue',
            deadline__lte=now
        )
        upcoming_tasks = Task.objects.filter(
            user=account,
            status__in=['in_progress', 'pending'],
            deadline__gte=now,
            deadline__lte=future_date
        )

        categories = [t.category for t in completed_tasks]
        most_productive_category = Counter(categories).most_common(1)
        most_productive_category = most_productive_category[0][0] if most_productive_category else ''

        days = [t.completed_at.date() for t in completed_tasks if t.completed_at]
        most_completed_day = Counter(days).most_common(1)
        most_completed_day = most_completed_day[0][0].strftime('%B %d, %Y') if most_completed_day else ''

        total_completed = completed_tasks.count()
        total_due = completed_tasks.count() + missed_tasks.count()
        completion_rate = (total_completed / total_due * 100) if total_due > 0 else 0.0

        def serialize_task(task, completed=False):
            return {
                'id': task.id,
                'name': task.name,
                'category': task.category,
                'priority': task.priority,
                'completedDate': task.completed_at.strftime('%Y-%m-%d') if completed and task.completed_at else None,
                'dueDate': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
            }
        completed_list = [serialize_task(t, completed=True) for t in completed_tasks]
        missed_list = [serialize_task(t) for t in missed_tasks]
        upcoming_list = [serialize_task(t) for t in upcoming_tasks]

        return Response({
            'completed': completed_list,
            'missed': missed_list,
            'due': upcoming_list,
            'trends': {
                'mostProductiveCategory': most_productive_category,
                'mostCompletedDay': most_completed_day,
                'totalCompleted': total_completed,
                'completionRate': round(completion_rate, 1)
            }
        })
    serializer_class = TaskSerializer
    queryset = Task.objects.all()
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")
        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")
        return Task.objects.filter(user=account)

    def perform_create(self, serializer):
        user_id = self.request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")
        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")
        serializer.save(user=account)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark a task as completed and reward user with XP and coins based on priority.
        """
        user_id = request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")
        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")

        try:
            task = Task.objects.get(pk=pk, user=account)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found."}, status=404)

        if task.status == "completed":
            return Response({"detail": "Task already completed."}, status=400)

        # Set task as completed
        task.status = "completed"
        task.completed_at = timezone.now()
        task.save()

        # Determine rewards
        priority = task.priority.lower()
        if priority == "low":
            xp_gain, coin_gain = 3, 10
        elif priority == "medium":
            xp_gain, coin_gain = 5, 20
        elif priority == "high":
            xp_gain, coin_gain = 10, 30
        else:
            xp_gain, coin_gain = 0, 0

        # Update coins
        account.coins += coin_gain
        account.save()

        # Update tamagotchi XP and level
        try:
            tamagotchi = Tamagotchi.objects.get(user=account)
        except Tamagotchi.DoesNotExist:
            return Response({"detail": "Tamagotchi not found."}, status=404)

        tamagotchi.xp += xp_gain
        leveled_up = False
        while tamagotchi.xp >= 100:
            tamagotchi.xp -= 100
            tamagotchi.level += 1
            leveled_up = True
        # Increase health by 1 (max 5)
        tamagotchi.increase_health(1.0)
        tamagotchi.save()

        return Response({
            "xp": tamagotchi.xp,
            "level": tamagotchi.level,
            "coins": account.coins,
            "health": tamagotchi.health,
            "leveled_up": leveled_up,
            "task_id": task.id,
            "task_status": task.status
        })

    @action(detail=True, methods=['post'])
    def mark_incomplete(self, request, pk=None):
        """
        Mark a task as incomplete, decrease coins and xp, and remove a heart if overdue.
        """
        user_id = request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")
        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")

        try:
            task = Task.objects.get(pk=pk, user=account)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found."}, status=404)

        if task.status != "completed":
            return Response({"detail": "Task is not completed."}, status=400)

        # Set task as in_progress
        task.status = "in_progress"
        task.save()

        # Determine penalty
        priority = task.priority.lower()
        if priority == "low":
            xp_loss, coin_loss = 3, 10
        elif priority == "medium":
            xp_loss, coin_loss = 5, 20
        elif priority == "high":
            xp_loss, coin_loss = 10, 30
        else:
            xp_loss, coin_loss = 0, 0

        # Update coins (don't go below 0)
        account.coins = max(0, account.coins - coin_loss)
        account.save()

        # Update tamagotchi XP and level (don't go below 0 XP)
        try:
            tamagotchi = Tamagotchi.objects.get(user=account)
        except Tamagotchi.DoesNotExist:
            return Response({"detail": "Tamagotchi not found."}, status=404)

        tamagotchi.xp = max(0, tamagotchi.xp - xp_loss)
        # If task is overdue, decrease health by 1
        remove_heart = False
        if task.status == "overdue":
            tamagotchi.decrease_health(1.0)
            remove_heart = True
        tamagotchi.save()

        return Response({
            "xp": tamagotchi.xp,
            "level": tamagotchi.level,
            "coins": account.coins,
            "health": tamagotchi.health,
            "remove_heart": remove_heart,
            "task_id": task.id,
            "task_status": task.status
        })

