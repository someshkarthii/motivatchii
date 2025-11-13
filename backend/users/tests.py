from rest_framework.test import APITestCase
from rest_framework import status
from .models import Account, Notification

class NotificationsViewTests(APITestCase):
    def setUp(self):
        # create test users
        self.user = Account.objects.create(username="testuser", hashed_password="testpw")
        self.other_user = Account.objects.create(username="otheruser", hashed_password="otherpw")

        # set session user_id for self.user
        session = self.client.session
        session["user_id"] = self.user.id
        session.save()

        # URLs
        self.notifications_url = "/api/notifications/"
        self.follow_url = "/api/follow/"

    def test_follow_creates_notification(self):
        """Following another user should create a notification for the target user"""
        data = {"username": self.other_user.username}
        response = self.client.post(self.follow_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check notification was created
        notifications = Notification.objects.filter(user=self.other_user)
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.first().message, f"{self.user.username} started following you!")

    def test_get_notifications_only_for_current_user(self):
        """Users should only see their own notifications"""
        # Create notifications for both users
        Notification.objects.create(user=self.user, message="User1 notif")
        Notification.objects.create(user=self.other_user, message="User2 notif")

        response = self.client.get(self.notifications_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["message"], "User1 notif")

    def test_permission_denied_if_not_logged_in(self):
        """Accessing notifications requires authentication"""
        session = self.client.session
        session.clear()
        session.save()

        response = self.client.get(self.notifications_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_notifications_ordered_by_created_at_desc(self):
        """Notifications should be returned newest first"""
        # create two notifications
        first = Notification.objects.create(user=self.user, message="First")
        second = Notification.objects.create(user=self.user, message="Second")

        response = self.client.get(self.notifications_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data[0]["message"], "Second")
        self.assertEqual(data[1]["message"], "First")

    def test_follow_existing_following(self):
        """Following a user already followed should return 200 without creating a new notification"""
        # first follow
        self.client.post(self.follow_url, {"username": self.other_user.username}, format="json")
        # follow again
        response = self.client.post(self.follow_url, {"username": self.other_user.username}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=self.other_user).count(), 1)
