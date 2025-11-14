from rest_framework import serializers
from .models import Task, WeeklyChallenge, ChallengeParticipation

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
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