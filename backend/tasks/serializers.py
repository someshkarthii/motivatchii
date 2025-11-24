from rest_framework import serializers
from .models import Task, WeeklyChallenge, ChallengeParticipation, Event

class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for Task model.
    Exposes fields for task creation and updates, including optional notify setting.
    """
    # expose notify so frontend can create/update it; optional for backward compatibility
    notify = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'user',
            'name',
            'category',
            'deadline',
            'priority',
            'status',
            'completed_at',
            'notify',
        ]
        read_only_fields = ['user']


class WeeklyChallengeSerializer(serializers.ModelSerializer):
    """
    Serializer for WeeklyChallenge model.
    Returns challenge details including task count, priority, description, and deadline.
    """
    class Meta:
        model = WeeklyChallenge
        fields = ['id', 'task_count', 'priority', 'description', 'start_date', 'deadline', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChallengeParticipationSerializer(serializers.ModelSerializer):
    """
    Serializer for ChallengeParticipation model.
    Tracks which users have joined which challenges.
    """
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ChallengeParticipation
        fields = ['id', 'user', 'username', 'challenge', 'joined_at', 'reward_claimed']
        read_only_fields = ['id', 'joined_at', 'username']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'name', 'start', 'end', 'reward_coins', 'is_active']
        read_only_fields = ['id']

class LeaderboardEntrySerializer(serializers.Serializer):
    username = serializers.CharField()
    completed_count = serializers.IntegerField()
    last_completed_at = serializers.DateTimeField(allow_null=True)