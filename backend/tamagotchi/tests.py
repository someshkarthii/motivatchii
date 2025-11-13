from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from tamagotchi.models import Tamagotchi, MAX_HEALTH
from users.models import Account 

User = get_user_model()

class TamagotchiHealthTests(TestCase):

    def setUp(self):
        # create test Account
        self.user = Account.objects.create(
            username='testuser',
            hashed_password='hashedpassword123', 
            coins=0
        )

        # create test tamagotchi
        self.tamagotchi = Tamagotchi.objects.create(
            user=self.user,
            health=3.0
        )

        # setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # URL for health endpoint
        self.url = '/api/tamagotchi/health/'

    def test_get_health(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['health'], self.tamagotchi.health)

    def test_post_task_completed_increases_health(self):
        response = self.client.post(self.url, {'action': 'task_completed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tamagotchi.refresh_from_db()
        expected_health = min(3.0 + 1.0, MAX_HEALTH)
        self.assertEqual(response.data['health'], expected_health)

    def test_post_task_missed_decreases_health(self):
        response = self.client.post(self.url, {'action': 'task_missed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tamagotchi.refresh_from_db()
        expected_health = max(3.0 - 1.0, 0)
        self.assertEqual(response.data['health'], expected_health)

    def test_post_invalid_action_returns_400(self):
        response = self.client.post(self.url, {'action': 'invalid_action'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_health_no_tamagotchi_returns_404(self):
        self.tamagotchi.delete()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_no_tamagotchi_returns_404(self):
        self.tamagotchi.delete()
        response = self.client.post(self.url, {'action': 'task_completed'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
