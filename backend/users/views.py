from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view 
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth import logout  
from .serializers import AccountSerializer, NotificationSerializer
from .models import Account
from tamagotchi.models import Tamagotchi
from .models import Account, Notification


class UserView(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    queryset = Account.objects.all()

    def perform_create(self, serializer):
        # Hash password securely before saving
        hashed_pw = make_password(serializer.validated_data['hashed_password'])
        user = serializer.save(hashed_password=hashed_pw)

        # Automatically create Tamagotchi for the new user
        Tamagotchi.objects.create(user=user)

        return user


class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"detail": "Username and password required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Account.objects.get(username=username)
        except Account.DoesNotExist:
            return Response({"detail": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(password, user.hashed_password):
            return Response({"detail": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

        request.session["user_id"] = user.id
        request.session["username"] = user.username

        return Response({
            "message": "Login successful",
            "user_id": user.id,
            "username": user.username
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
def me(request):
    """Return currently logged-in user's info + tamagotchi summary."""
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = Account.objects.get(id=user_id)
        # attach tamagotchi info
        try:
            t = user.tamagotchi
            tama = {
                "level": t.level,
                "outfit": t.outfit,
                "unlocked_outfits": t.unlocked_outfits,
                "xp": getattr(t, "xp", 0) if getattr(t, "xp", None) is not None else 0,
            }
        except Tamagotchi.DoesNotExist:
            tama = {"level": 1, "outfit": 1, "unlocked_outfits": [1], "xp": 0}

        return Response({
            "username": user.username,
            "coins": user.coins,
            **tama
        })
    except Account.DoesNotExist:
        return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)

class PurchaseOutfitView(APIView):
    """
    POST { outfit_id: int }  # 1..9
    - checks coins vs price
    - deducts coins
    - adds outfit_id to unlocked_outfits
    """
    def post(self, request):
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        outfit_id = request.data.get("outfit_id")
        try:
            outfit_id = int(outfit_id)
        except (TypeError, ValueError):
            return Response({"error": "Invalid outfit_id"}, status=status.HTTP_400_BAD_REQUEST)

        if outfit_id < 1 or outfit_id > 9:
            return Response({"error": "outfit_id must be 1..9"}, status=status.HTTP_400_BAD_REQUEST)

        # Authoritative price list (kept in backend)
        price_map = {
            1: 0,      # default
            2: 50,     # bubble
            3: 100,    # computer
            4: 500,    # chicken
            5: 1000,   # apple
            6: 5000,   # pumpkin
            7: 10000,  # astronaut
            8: 20000,  # knife
            9: 50000,  # strawberry
        }

        try:
            user = Account.objects.get(id=user_id)
            tama = user.tamagotchi
        except (Account.DoesNotExist, Tamagotchi.DoesNotExist):
            return Response({"error": "Account/Tamagotchi not found"}, status=status.HTTP_404_NOT_FOUND)

        unlocked = list(tama.unlocked_outfits or [])
        price = price_map[outfit_id]

        # Already unlocked? nothing to charge; return success
        if outfit_id in unlocked:
            return Response({
                "coins": user.coins,
                "unlocked_outfits": unlocked
            }, status=status.HTTP_200_OK)

        # Check coins
        if user.coins < price:
            return Response({"error": "Not enough coins"}, status=status.HTTP_400_BAD_REQUEST)

        # Deduct + unlock
        user.coins -= price
        user.save()

        unlocked.append(outfit_id)
        tama.unlocked_outfits = unlocked
        tama.save()

        return Response({
            "coins": user.coins,
            "unlocked_outfits": unlocked
        }, status=status.HTTP_200_OK)


class SetOutfitView(APIView):
    """
    POST { outfit_id: int }
    - requires outfit_id to be in unlocked_outfits
    - sets tamagotchi.outfit
    """
    def post(self, request):
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        outfit_id = request.data.get("outfit_id")
        try:
            outfit_id = int(outfit_id)
        except (TypeError, ValueError):
            return Response({"error": "Invalid outfit_id"}, status=status.HTTP_400_BAD_REQUEST)

        if outfit_id < 1 or outfit_id > 9:
            return Response({"error": "outfit_id must be 1..9"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Account.objects.get(id=user_id)
            tama = user.tamagotchi
        except (Account.DoesNotExist, Tamagotchi.DoesNotExist):
            return Response({"error": "Account/Tamagotchi not found"}, status=status.HTTP_404_NOT_FOUND)

        unlocked = set(tama.unlocked_outfits or [])
        if outfit_id not in unlocked:
            return Response({"error": "Outfit not unlocked"}, status=status.HTTP_400_BAD_REQUEST)

        tama.outfit = outfit_id
        tama.save()

        return Response({"outfit": tama.outfit}, status=status.HTTP_200_OK)

class LogoutView(APIView):
    """
    Logs out the current user by clearing their Django session.
    """
    def post(self, request):
        logout(request) 
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

class UserConnectionsView(APIView):
    """Return both followers and following lists for the current user."""

    def get(self, request):
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "following": user.following or [],
            "followers": user.followers or [],
        }, status=status.HTTP_200_OK)

class FollowUserView(APIView):
    def post(self, request):
        """Add user to current user's following list"""

        # current user
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            current_user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Your account was not found"}, status=status.HTTP_404_NOT_FOUND)

        # target user
        target_username = request.data.get("username")
        if not target_username:
            return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = Account.objects.get(username=target_username)
        except Account.DoesNotExist:
            return Response({"error": "That user does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # prevent self-following
        if target_user.username == current_user.username:
            return Response({"error": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # check if already following
        if target_user.username in (current_user.following or []):
            return Response({"detail": "You already follow this user."}, status=status.HTTP_200_OK)

        # update following / followers lists
        current_user.following.append(target_user.username)
        current_user.save()
        target_user.followers.append(current_user.username)
        target_user.save()

        # create notification for user being followed
        Notification.objects.create(
            user=target_user,
            message=f"{current_user.username} started following you!"
        )

        return Response({
            "detail": f"You are now following {target_user.username}.",
            "following": current_user.following,
        }, status=status.HTTP_200_OK)

class UnfollowUserView(APIView):
    def post(self, request):
        """Remove user from current user's following list"""

        # current user
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            current_user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Your account was not found"}, status=status.HTTP_404_NOT_FOUND)

        # target user
        target_username = request.data.get("username")
        if not target_username:
            return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = Account.objects.get(username=target_username)
        except Account.DoesNotExist:
            return Response({"error": "That user does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # check if following user
        if target_username not in (current_user.following or []):
            return Response({"detail": "You are not following this user."}, status=400)

        # remove from following/followers
        current_user.following.remove(target_username)
        current_user.save()

        if current_user.username in (target_user.followers or []):
            target_user.followers.remove(current_user.username)
            target_user.save()

        return Response({"detail": f"You have unfollowed {target_username}."}, status=200)

class RemoveFollowerView(APIView):
    def post(self, request):
        """Remove a follower from current user's followers."""

        # current user
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Your account was not found"}, status=status.HTTP_404_NOT_FOUND)

        # follower
        follower_username = request.data.get("username")
        if not follower_username:
            return Response({"error": "Username required"}, status=400)
        try:
            follower = Account.objects.get(username=follower_username)
        except Account.DoesNotExist:
            return Response({"error": "That user does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # remove follower
        if follower_username in (user.followers or []):
            user.followers.remove(follower_username)
            user.save()
        if user.username in (follower.following or []):
            follower.following.remove(user.username)
            follower.save()

        return Response({"detail": f"{follower_username} removed from your followers."}, status=200)

class FollowingCoinsView(APIView):
    def get(self, request, target_username):
        """Returns a user's total coins if the current user follows them"""
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=status.HTTP_404_NOT_FOUND)

        # check that target exists
        try:
            target = Account.objects.get(username=target_username)
        except Account.DoesNotExist:
            return Response({"error": "Target user not found"}, status=status.HTTP_404_NOT_FOUND)

        # check that target is followed by current user
        following_list = user.following or []
        if target.username not in following_list:
            return Response({"detail": "You are not following this user."},
                            status=status.HTTP_403_FORBIDDEN)

        # return the target user's coins
        return Response({"username": target.username, "coins": target.coins}, status=status.HTTP_200_OK)

class NotificationsView(APIView):
    """Return all notifications for the current logged-in user."""

    def get(self, request):
        user_id = request.session.get("user_id")
        if not user_id:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        notifications = Notification.objects.filter(user=user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)