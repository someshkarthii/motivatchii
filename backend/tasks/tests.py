from rest_framework.test import APITestCase
from rest_framework import status
from users.models import Account
from tasks.models import Task

class TaskViewTests(APITestCase):
    def setUp(self):
        # create test user
        self.user = Account.objects.create(
            username="testusername",
            hashed_password="testpassword"
        )

        # set session user_id 
        session = self.client.session
        session["user_id"] = self.user.id
        session.save()

        # set url
        self.url = "/api/tasks/"

    def test_create_task(self):
        """Test that tasks can be created"""
        data = {
            "name": "Backend Test Task",
            "category": "Test",
            "priority": "Low",
            "deadline": "2024-04-07",
            "status": "in_progress",
        }
        response = self.client.post(self.url, data, format="json")

        # check response code
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # check database result
        self.assertEqual(Task.objects.count(), 1)
        task = Task.objects.first()
        self.assertEqual(task.user, self.user)
        self.assertEqual(task.name, "Backend Test Task")
        self.assertEqual(task.status, "in_progress")

    def test_get_tasks_only_for_current_user(self):
        """Test that users can only access their own tasks"""
        # create another user 
        other_user = Account.objects.create(username="other", hashed_password="pw")

        # create a task for the other user
        Task.objects.create(
            name="Other Task", 
            category="Test", 
            priority="Low",
            deadline="2024-04-07", 
            status="in_progress",
            user=other_user
        )

        # create task for current user
        Task.objects.create(
            name="Task", 
            category="Test", 
            priority="Low",
            deadline="2024-04-07", 
            status="in_progress",
            user=self.user
        )

        # check response code
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # check database result (should only have current user's task)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Task")

    def test_permission_denied_if_not_logged_in(self):
        """Test that authentication is required"""
        # clear the session user_id
        session = self.client.session
        session.clear()
        session.save()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_task(self):
        """Test that tasks can be updated"""
        # create task
        task = Task.objects.create(
            name="Change Me",
            category="Test",
            priority="Low",
            deadline="2024-04-07",
            status="in_progress",
            user=self.user
        )

        # change task name
        response = self.client.patch(f"{self.url}{task.id}/", {"name": "Changed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.name, "Changed")

        # change task status
        response = self.client.patch(f"{self.url}{task.id}/", {"status": "completed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.status, "completed")

    def test_delete_task(self):
        """Test that tasks can be deleted"""
        task = Task.objects.create(
            name="Delete Me",
            category="Test",
            priority="Low",
            deadline="2024-04-07",
            status="in_progress",
            user=self.user
        )

        response = self.client.delete(f"{self.url}{task.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Task.objects.count(), 0)
