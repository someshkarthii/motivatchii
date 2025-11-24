from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from users.models import Account, Notification
from tasks.models import Task, WeeklyChallenge, ChallengeParticipation, Event
from datetime import date, timedelta
from django.db import models

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


class ChallengeFlowTests(APITestCase):
    """End-to-end tests for weekly community challenges."""

    def setUp(self):
        # Three users: Alice (test subject), Bob (mutual friend), Charlie (non-friend)
        self.alice = Account.objects.create(username="alice", hashed_password="pw")
        self.bob = Account.objects.create(username="bob", hashed_password="pw")
        self.charlie = Account.objects.create(username="charlie", hashed_password="pw")

        # Alice and Bob are mutual followers (they follow each other)
        self.alice.following = ["bob"]
        self.alice.followers = ["bob"]
        self.alice.save()
        self.bob.following = ["alice"]
        self.bob.followers = ["alice"]
        self.bob.save()

        # helper: set session as a specific user
        self.base_urls = {
            "weekly": "/api/challenges/weekly/",
            "join": "/api/challenges/join/",
            "status": "/api/challenges/status/",
            "team_members": "/api/challenges/team-members/",
            "team_progress": "/api/challenges/team-progress/",
        }

    def _as_user(self, user):
        session = self.client.session
        session["user_id"] = user.id
        session.save()

    def _get_weekly_challenge(self):
        # Ensures a weekly challenge exists and returns it
        resp = self.client.get(self.base_urls["weekly"])  # creates one if needed
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        return WeeklyChallenge.objects.get(id=data["id"]) if "id" in data else WeeklyChallenge.objects.latest("start_date")

    def test_weekly_challenge_created_and_shared(self):
        # Alice fetches weekly challenge
        self._as_user(self.alice)
        resp1 = self.client.get(self.base_urls["weekly"])  # creates if not exists
        self.assertEqual(resp1.status_code, 200)
        challenge_id_1 = resp1.json()["id"]

        # Bob fetches the same weekly challenge
        self._as_user(self.bob)
        resp2 = self.client.get(self.base_urls["weekly"])  # should be the same
        self.assertEqual(resp2.status_code, 200)
        challenge_id_2 = resp2.json()["id"]

        self.assertEqual(challenge_id_1, challenge_id_2)

    def test_join_and_status(self):
        self._as_user(self.alice)
        self._get_weekly_challenge()

        # Initially, not joined
        resp = self.client.get(self.base_urls["status"])
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["has_joined"])

        # Join
        resp = self.client.post(self.base_urls["join"], {})
        self.assertIn(resp.status_code, (200, 201))

        # Now joined
        resp = self.client.get(self.base_urls["status"])
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["has_joined"])

    def test_team_members_only_include_friends(self):
        ch = None

        # Bob joins first
        self._as_user(self.bob)
        ch = self._get_weekly_challenge()
        self.client.post(self.base_urls["join"], {})

        # Alice joins; should see Bob in team members
        self._as_user(self.alice)
        self.client.post(self.base_urls["join"], {})
        resp = self.client.get(self.base_urls["team_members"])
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["team_members"], [{"username": "bob"}])

        # Charlie joins but is not Alice's friend; should not appear
        self._as_user(self.charlie)
        self.client.post(self.base_urls["join"], {})

        # Alice still only sees Bob
        self._as_user(self.alice)
        resp = self.client.get(self.base_urls["team_members"])
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["team_members"], [{"username": "bob"}])

    def test_team_uses_transitive_mutual_following(self):
        """Test that team includes users connected through transitive mutual following."""
        # Setup: Create a third user Dave who mutually follows Alice but not Bob
        dave = Account.objects.create(username="dave", hashed_password="pw")
        
        # Alice and Dave mutually follow each other
        self.alice.following.append("dave")
        self.alice.followers.append("dave")
        self.alice.save()
        dave.following = ["alice"]
        dave.followers = ["alice"]
        dave.save()
        
        # Now: Alice <-> Bob, Alice <-> Dave, but Bob and Dave don't follow each other
        # With transitive logic, Alice's team should include both Bob and Dave
        # (they're connected through Alice via mutual following)
        
        self._as_user(self.alice)
        challenge = self._get_weekly_challenge()
        self.client.post(self.base_urls["join"], {})
        
        self._as_user(self.bob)
        self.client.post(self.base_urls["join"], {})
        
        self._as_user(dave)
        self.client.post(self.base_urls["join"], {})
        
        # Alice should see both Bob and Dave (transitive team through mutual following)
        self._as_user(self.alice)
        resp = self.client.get(self.base_urls["team_members"])
        self.assertEqual(resp.status_code, 200)
        team_usernames = {member["username"] for member in resp.json()["team_members"]}
        self.assertEqual(team_usernames, {"bob", "dave"})
        
        # Bob should see both Alice and Dave (transitive through Alice)
        self._as_user(self.bob)
        resp = self.client.get(self.base_urls["team_members"])
        self.assertEqual(resp.status_code, 200)
        team_usernames = {member["username"] for member in resp.json()["team_members"]}
        self.assertEqual(team_usernames, {"alice", "dave"})
        
        # Dave should also see both Alice and Bob
        self._as_user(dave)
        resp = self.client.get(self.base_urls["team_members"])
        self.assertEqual(resp.status_code, 200)
        team_usernames = {member["username"] for member in resp.json()["team_members"]}
        self.assertEqual(team_usernames, {"alice", "bob"})

    def test_team_progress_and_rewards(self):
        # Arrange: Alice and Bob join
        self._as_user(self.alice)
        challenge = self._get_weekly_challenge()
        self.client.post(self.base_urls["join"], {})

        self._as_user(self.bob)
        self.client.post(self.base_urls["join"], {})

        # Determine matching priority and window
        priority = challenge.priority
        start_dt = challenge.start_date
        end_dt = challenge.deadline

        # Create completed tasks within window for Alice and Bob to reach target
        # Split evenly; if odd, Alice will do the remainder
        total_needed = challenge.task_count
        bob_count = total_needed // 2
        alice_count = total_needed - bob_count

        # Helper to create N completed tasks
        def make_completed_tasks(user, n):
            for i in range(n):
                t = Task.objects.create(
                    user=user,
                    name=f"task-{user.username}-{i}",
                    category="Challenge",
                    priority=priority,
                    status="completed",
                    deadline=None,
                    completed_at=start_dt + (end_dt - start_dt) / (total_needed + 1)  # inside window
                )

        make_completed_tasks(self.alice, alice_count)
        make_completed_tasks(self.bob, bob_count)

        # Act: Alice requests team progress; should be complete and award 20 coins exactly once
        self._as_user(self.alice)
        coins_before = self.alice.coins
        resp = self.client.get(self.base_urls["team_progress"])
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["challenge_complete"])
        self.assertEqual(data["total"], total_needed)
        self.assertGreaterEqual(data["completed"], total_needed)
        self.assertEqual(data["reward_earned"], 20)

        # Reload Alice to check coin change
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.coins, coins_before + 20)

        # Second call should not award again
        resp2 = self.client.get(self.base_urls["team_progress"])
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["reward_earned"], 0)

    def test_non_friend_progress_is_separate(self):
        # Charlie joins and completes tasks alone
        self._as_user(self.charlie)
        challenge = self._get_weekly_challenge()
        self.client.post(self.base_urls["join"], {})

        # Charlie completes some tasks (but Alice will not see them)
        n = min(5, challenge.task_count)
        for i in range(n):
            Task.objects.create(
                user=self.charlie,
                name=f"charlie-{i}",
                category="Challenge",
                priority=challenge.priority,
                status="completed",
                completed_at=challenge.start_date + (challenge.deadline - challenge.start_date) / (challenge.task_count + 2)
            )

        # Alice joins but has no team members yet; progress should not include Charlie's tasks
        self._as_user(self.alice)
        self.client.post(self.base_urls["join"], {})
        resp = self.client.get(self.base_urls["team_progress"])
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # completed should be 0 or less than Charlie's count because Alice's team excludes Charlie
        self.assertEqual(data["completed"], 0)

class EventTests(APITestCase):
    def setUp(self):
        # Users
        self.user1 = Account.objects.create(username="user1", hashed_password="pw1")
        self.user2 = Account.objects.create(username="user2", hashed_password="pw2")

        # Event: started 1 day ago, ends 1 day later
        self.event = Event.objects.create(
            name="Test Event",
            start=timezone.now() - timedelta(days=1),
            end=timezone.now() + timedelta(days=1),
            reward_coins=100,
            is_active=True
        )

        # Session for user1
        session = self.client.session
        session["user_id"] = self.user1.id
        session.save()

        # URL
        self.url = "/api/events/leaderboard/"

    def test_leaderboard_empty(self):
        """Leaderboard empty if no tasks completed"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["leaderboard"], [])
        self.assertIsNone(data["your_rank"])

    def test_leaderboard_with_tasks(self):
        """Leaderboard shows tasks completed by multiple users"""
        # Tasks
        Task.objects.create(user=self.user1, name="Task1", status="completed", completed_at=timezone.now())
        Task.objects.create(user=self.user2, name="Task1", status="completed", completed_at=timezone.now())
        Task.objects.create(user=self.user2, name="Task2", status="completed", completed_at=timezone.now())

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        leaderboard = data["leaderboard"]
        self.assertEqual(len(leaderboard), 2)
        self.assertEqual(leaderboard[0]["username"], "user2")  # 2 tasks
        self.assertEqual(leaderboard[1]["username"], "user1")  # 1 task
        self.assertEqual(data["your_rank"], 2)  # user1 rank

    def test_event_end_winner(self):
        """Event ends automatically, awards winner coins and notification"""
        # End event in the past
        self.event.end = timezone.now() - timedelta(hours=1)
        self.event.save()

        # Tasks
        Task.objects.create(user=self.user1, name="Task1", status="completed", completed_at=self.event.start + timedelta(hours=1))
        Task.objects.create(user=self.user2, name="Task1", status="completed", completed_at=self.event.start + timedelta(hours=2))
        Task.objects.create(user=self.user2, name="Task2", status="completed", completed_at=self.event.start + timedelta(hours=3))

        response = self.client.get(self.url)
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertIn("detail", data)
        self.assertEqual(data["detail"], "Event has ended")
        self.assertEqual(data["winner"], "user2")

        # Winner coins
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.coins, self.event.reward_coins)

        # Notification
        notif = Notification.objects.filter(user=self.user2).first()
        self.assertIsNotNone(notif)
        self.assertIn("won the event", notif.message)

        # Event inactive
        self.event.refresh_from_db()
        self.assertFalse(self.event.is_active)

    def test_no_active_event(self):
        """Response when no active event exists"""
        self.event.is_active = False
        self.event.save()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())
        self.assertEqual(response.json()["detail"], "No active event")