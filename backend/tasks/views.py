
from rest_framework import viewsets, permissions
from .models import Task, WeeklyChallenge, ChallengeParticipation, Event
from .serializers import TaskSerializer, WeeklyChallengeSerializer, ChallengeParticipationSerializer, EventSerializer, LeaderboardEntrySerializer
from users.models import Account, Notification
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from tamagotchi.models import Tamagotchi
from django.utils import timezone
from datetime import timedelta, datetime
from collections import Counter
import random
from django.db import models


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


class WeeklyChallengeView(APIView):
    """
    API endpoint to get or create the current week's challenge.
    Challenges run from Sunday 12:00 AM to Saturday 11:59 PM.
    """
    
    def get(self, request):
        """
        GET the current weekly challenge. If one doesn't exist for this week, create it.
        Returns: Challenge details (task_count, priority, description, start_date, deadline)
        """
        now = timezone.now()
        
        # Calculate the current week's Sunday 12:00 AM
        last_sunday = now - timedelta(days=now.weekday() + 1 if now.weekday() != 6 else 0)
        if now.weekday() == 6:  # Sunday
            last_sunday = now
        last_sunday = last_sunday.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate next Saturday 11:59 PM
        next_saturday = last_sunday + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        # Try to get existing challenge for this week
        challenge = WeeklyChallenge.objects.filter(
            start_date__lte=now,
            deadline__gte=now
        ).first()
        
        # If no challenge exists for current week, create one
        if not challenge:
            challenge = self._generate_weekly_challenge(last_sunday, next_saturday)
        
        serializer = WeeklyChallengeSerializer(challenge)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _generate_weekly_challenge(self, start_date, deadline):
        """
        Helper method to generate a random weekly challenge.
        Randomly selects task count (15-30) and priority (Low/Medium/High).
        """
        task_count = random.randint(15, 30)
        priorities = ['Low', 'Medium', 'High']
        priority = random.choice(priorities)
        description = f"Complete {task_count} {priority} priority tasks"
        
        challenge = WeeklyChallenge.objects.create(
            task_count=task_count,
            priority=priority,
            description=description,
            start_date=start_date,
            deadline=deadline
        )
        return challenge


class JoinChallengeView(APIView):
    """
    API endpoint for users to join the current weekly challenge.
    """
    
    def post(self, request):
        """
        POST to join the current weekly challenge.
        Creates a ChallengeParticipation record linking the user to the challenge.
        Returns: Success message and participation details
        """
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get current week's challenge
        now = timezone.now()
        challenge = WeeklyChallenge.objects.filter(
            start_date__lte=now,
            deadline__gte=now
        ).first()
        
        if not challenge:
            return Response({"error": "No active challenge found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user already joined this challenge
        participation, created = ChallengeParticipation.objects.get_or_create(
            user=user,
            challenge=challenge
        )
        
        if not created:
            return Response({
                "message": "Already joined this challenge",
                "challenge_id": challenge.id
            }, status=status.HTTP_200_OK)
        
        return Response({
            "message": "Successfully joined the challenge",
            "challenge_id": challenge.id,
            "joined_at": participation.joined_at
        }, status=status.HTTP_201_CREATED)


class ChallengeStatusView(APIView):
    """
    API endpoint to check if the current user has joined the current weekly challenge.
    """
    
    def get(self, request):
        """
        GET whether the user has joined the current weekly challenge.
        Returns: Boolean indicating if user has joined
        """
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get current week's challenge
        now = timezone.now()
        challenge = WeeklyChallenge.objects.filter(
            start_date__lte=now,
            deadline__gte=now
        ).first()
        
        if not challenge:
            return Response({"has_joined": False}, status=status.HTTP_200_OK)
        
        # Check if user has joined this challenge
        has_joined = ChallengeParticipation.objects.filter(
            user=user,
            challenge=challenge
        ).exists()
        
        return Response({"has_joined": has_joined}, status=status.HTTP_200_OK)


class TeamMembersView(APIView):
    """
    API endpoint to get team members for the current weekly challenge.
    Team = users who mutually follow the current user (pairwise mutual following).
    """
    
    def get(self, request):
        """
        GET list of team members who mutually follow the current user.
        Returns: List of usernames who mutually follow the current user and joined the challenge
        """
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get current week's challenge
        now = timezone.now()
        challenge = WeeklyChallenge.objects.filter(
            start_date__lte=now,
            deadline__gte=now
        ).first()
        
        if not challenge:
            return Response({"team_members": []}, status=status.HTTP_200_OK)
        
        # Check if current user has joined the challenge
        user_joined = ChallengeParticipation.objects.filter(
            user=user,
            challenge=challenge
        ).exists()
        
        if not user_joined:
            return Response({"team_members": []}, status=status.HTTP_200_OK)
        
        # Get user's following and followers lists
        following_usernames = set(user.following or [])
        follower_usernames = set(user.followers or [])
        
        # Find mutual followers (users who follow each other with current user)
        mutual_usernames = following_usernames & follower_usernames

        # Build transitive team: start with current user + direct mutual followers
        team_usernames = set([user.username]) | set(mutual_usernames)
        
        # Expand team to include mutual followers of team members (transitive)
        expanded = True
        while expanded:
            expanded = False
            current_team_size = len(team_usernames)
            
            # Get all team member accounts
            team_accounts = Account.objects.filter(username__in=team_usernames)
            
            for member in team_accounts:
                member_following = set(member.following or [])
                member_followers = set(member.followers or [])
                member_mutual = member_following & member_followers
                
                # Add mutual followers of this team member to the team
                new_members = member_mutual - team_usernames
                if new_members:
                    team_usernames.update(new_members)
                    expanded = True
            
            # Break if no new members were added
            if len(team_usernames) == current_team_size:
                break

        # Get all team members who have joined the challenge (excluding current user)
        team_participations = ChallengeParticipation.objects.filter(
            challenge=challenge,
            user__username__in=team_usernames
        ).select_related('user').exclude(user=user)

        team_members = [
            {"username": p.user.username}
            for p in team_participations
        ]

        return Response({"team_members": team_members}, status=status.HTTP_200_OK)


class TeamProgressView(APIView):
    """
    API endpoint to get the team's progress on the current weekly challenge.
    Calculates total tasks completed by all team members matching the challenge criteria.
    """
    
    def get(self, request):
        """
        GET team progress for current weekly challenge.
        Returns: completed (tasks done), total (target), and checks if reward should be given
        """
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get current week's challenge
        now = timezone.now()
        challenge = WeeklyChallenge.objects.filter(
            start_date__lte=now,
            deadline__gte=now
        ).first()
        
        if not challenge:
            return Response({
                "completed": 0,
                "total": 0
            }, status=status.HTTP_200_OK)
        
        # Check if current user has joined the challenge
        user_participation = ChallengeParticipation.objects.filter(
            user=user,
            challenge=challenge
        ).first()
        
        if not user_participation:
            return Response({
                "completed": 0,
                "total": challenge.task_count
            }, status=status.HTTP_200_OK)
        
        # Get user's following and followers lists
        following_usernames = set(user.following or [])
        follower_usernames = set(user.followers or [])
        
        # Find mutual followers (users who follow each other with current user)
        mutual_usernames = following_usernames & follower_usernames

        # Build transitive team: start with current user + direct mutual followers
        team_usernames = set([user.username]) | set(mutual_usernames)
        
        # Expand team to include mutual followers of team members (transitive)
        expanded = True
        while expanded:
            expanded = False
            current_team_size = len(team_usernames)
            
            # Get all team member accounts
            team_accounts = Account.objects.filter(username__in=team_usernames)
            
            for member in team_accounts:
                member_following = set(member.following or [])
                member_followers = set(member.followers or [])
                member_mutual = member_following & member_followers
                
                # Add mutual followers of this team member to the team
                new_members = member_mutual - team_usernames
                if new_members:
                    team_usernames.update(new_members)
                    expanded = True
            
            # Break if no new members were added
            if len(team_usernames) == current_team_size:
                break
        
        # Get all team members who have joined the challenge
        team_participations = list(ChallengeParticipation.objects.filter(
            challenge=challenge,
            user__username__in=team_usernames
        ).select_related('user'))
        
        if not team_participations:
            # No team members joined
            return Response({
                "completed": 0,
                "total": challenge.task_count,
                "challenge_complete": False,
                "reward_earned": 0
            }, status=status.HTTP_200_OK)
        
        # Build team from all team members who joined (including current user)
        valid_team_members = [p.user for p in team_participations]
        
        # Get IDs of all valid team members
        team_user_ids = [member.id for member in valid_team_members]
        
        # Count completed tasks matching challenge criteria
        # Tasks must be completed during the challenge period and match the priority
        completed_count = Task.objects.filter(
            user_id__in=team_user_ids,
            status='completed',
            priority__iexact=challenge.priority,
            completed_at__gte=challenge.start_date,
            completed_at__lte=challenge.deadline
        ).count()
        
        # Check if challenge is complete and reward hasn't been claimed
        challenge_complete = completed_count >= challenge.task_count
        reward_amount = 0
        
        if challenge_complete:
            # Award 20 coins to ALL team members who haven't claimed yet
            team_participations_to_reward = ChallengeParticipation.objects.filter(
                challenge=challenge,
                user_id__in=team_user_ids,
                reward_claimed=False
            ).select_related('user')
            
            for participation in team_participations_to_reward:
                # Award coins to each team member
                participation.user.coins += 20
                participation.user.save()
                
                # Mark reward as claimed
                participation.reward_claimed = True
                participation.save()
            
            # Check if current user just got rewarded
            if not user_participation.reward_claimed:
                reward_amount = 20
        
        return Response({
            "completed": completed_count,
            "total": challenge.task_count,
            "challenge_complete": challenge_complete,
            "reward_earned": reward_amount
        }, status=status.HTTP_200_OK)


class DebugTeamView(APIView):
    """
    Debug endpoint to check following/followers data for troubleshooting team issues.
    """
    
    def get(self, request):
        """
        GET debug info about current user's following/followers and potential team.
        """
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get current week's challenge
        now = timezone.now()
        challenge = WeeklyChallenge.objects.filter(
            start_date__lte=now,
            deadline__gte=now
        ).first()
        
        if not challenge:
            return Response({"error": "No active challenge"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check participation
        user_joined = ChallengeParticipation.objects.filter(
            user=user,
            challenge=challenge
        ).exists()
        
        # Get following/followers
        following = user.following or []
        followers = user.followers or []
        mutual = list(set(following) & set(followers))
        
        # Check each mutual follower's data
        mutual_details = []
        for username in mutual:
            try:
                other_user = Account.objects.get(username=username)
                other_joined = ChallengeParticipation.objects.filter(
                    user=other_user,
                    challenge=challenge
                ).exists()
                
                mutual_details.append({
                    "username": username,
                    "joined_challenge": other_joined,
                    "their_following": other_user.following or [],
                    "their_followers": other_user.followers or [],
                    "they_follow_you": user.username in (other_user.following or []),
                    "they_are_followed_by_you": user.username in (other_user.followers or [])
                })
            except Account.DoesNotExist:
                mutual_details.append({
                    "username": username,
                    "error": "User not found"
                })
        
        return Response({
            "current_user": user.username,
            "joined_challenge": user_joined,
            "following": following,
            "followers": followers,
            "mutual": mutual,
            "mutual_details": mutual_details
        }, status=status.HTTP_200_OK)

class CurrentEventView(APIView):
    """
    Returns the currently active event, or null.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        event = Event.objects.filter(is_active=True).order_by('-start').first()
        if not event:
            return Response(None, status=status.HTTP_200_OK)
        serializer = EventSerializer(event)
        return Response(serializer.data, status=status.HTTP_200_OK)

class EventLeaderboardView(APIView):
    """
    Returns the leaderboard for the current active event.
    Ends the event automatically if the end datetime has passed.
    """

    def get(self, request):
        now = timezone.now()
        try:
            event = Event.objects.get(start__lte=now, end__gte=now)
        except Event.DoesNotExist:
            return Response({"detail": "No active event"}, status=status.HTTP_404_NOT_FOUND)

        # Automatically end event if it has ended
        if event.has_ended():
            winner = event.end_event()
            return Response({
                "detail": "Event has ended",
                "winner": winner.username if winner else None
            })

        # Get completed tasks counts for this event
        task_counts = (
            Task.objects.filter(
                status="completed",
                completed_at__range=(event.start, event.end)
            )
            .values('user__username', 'user')
            .annotate(count=models.Count('id'))
            .order_by('-count', 'user')
        )

        # Top 3 leaderboard
        leaderboard = []
        for rank, item in enumerate(task_counts[:3], start=1):
            leaderboard.append({
                "rank": rank,
                "username": item['user__username'],
                "tasks_completed": item['count']
            })

        # Get current user rank
        user_rank = None
        user_completed_tasks = 0
        user_id = request.session.get("user_id")
        if user_id:
            for idx, item in enumerate(task_counts, start=1):
                if item['user'] == user_id:
                    user_rank = idx
                    user_completed_tasks = item['count']
                    break

        return Response({
            "event_name": event.name,
            "leaderboard": leaderboard,
            "your_rank": user_rank,
            "your_completed_tasks": user_completed_tasks
        })