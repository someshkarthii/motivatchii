from rest_framework.views import APIView, status
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from tamagotchi.models import Tamagotchi
from users.models import Account

class TamagotchiHealthView(APIView):
    permission_classes = [permissions.AllowAny]  # Allow access; we handle session manually

    def get(self, request):
        user_id = request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")

        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")

        try:
            tamagotchi = Tamagotchi.objects.get(user=account)
        except Tamagotchi.DoesNotExist:
            return Response({"detail": "Tamagotchi not found."}, status=404)

        return Response({"health": tamagotchi.health})

    def post(self, request):
        user_id = request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")

        try:
            account = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account does not exist.")

        try:
            tamagotchi = Tamagotchi.objects.get(user=account)
        except Tamagotchi.DoesNotExist:
            return Response({"detail": "Tamagotchi not found."}, status=404)

        action = request.data.get("action")
        actions = {
            "task_completed": tamagotchi.increase_health,
            "task_missed": tamagotchi.decrease_health,
        }

        if action not in actions:
            return Response({"detail": "Invalid action."}, status=400)

        actions[action]()  # perform the health change
        return Response({"health": tamagotchi.health})

class FollowingTamagotchiView(APIView):
    permission_classes = [permissions.AllowAny]  # Using session manually

    def get(self, request, target_username):
        """Returns another user's tamagotchi if the session user follows them"""
        user_id = request.session.get("user_id")
        if not user_id:
            raise PermissionDenied("Not authenticated.")

        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise PermissionDenied("Account not found.")

        # check if target exists
        try:
            target_user = Account.objects.get(username=target_username)
        except Account.DoesNotExist:
            return Response({"detail": "Followed account not found."}, status=404)

        # check if target is followed by user
        if target_username not in (user.following or []):
            return Response({"detail": "You are not following this user."},
                            status=status.HTTP_403_FORBIDDEN)

        # get target tamagotchi
        try:
            tama = Tamagotchi.objects.get(user=target_user)
        except Tamagotchi.DoesNotExist:
            return Response({"detail": "Tamagotchi not found."}, status=404)

        # return tamagotchi info for frontend display
        return Response({
            "username": target_user.username,
            "level": tama.level,
            "hearts": tama.health,
            "outfit_id": tama.outfit,
        }, status=200)