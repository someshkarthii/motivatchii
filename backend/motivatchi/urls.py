"""
URL configuration for motivatchi project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from users import views as user_views
from tamagotchi import views as tamagotchi_views
from users.views import LoginView, LogoutView, me, PurchaseOutfitView, SetOutfitView
from tasks import views as task_views

router = routers.DefaultRouter()
router.register(r'users', user_views.UserView, 'user')
router.register(r'tasks', task_views.TaskView, 'task')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login/', LoginView.as_view(), name='login'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/me/', me, name='me'),
    path('api/tamagotchi/purchase-outfit/', PurchaseOutfitView.as_view(), name='purchase_outfit'),
    path('api/tamagotchi/set-outfit/', SetOutfitView.as_view(), name='set_outfit'),
    path('api/tamagotchi/health/', tamagotchi_views.TamagotchiHealthView.as_view(), name='tamagotchi-health'),
    path("api/connections/", user_views.UserConnectionsView.as_view(), name="user_connections"),
    path("api/follow/", user_views.FollowUserView.as_view(), name="follow_user"),
    path("api/unfollow/", user_views.UnfollowUserView.as_view(), name="unfollow_user"),
    path("api/remove-follower/", user_views.RemoveFollowerView.as_view(), name="remove_follower"),
    path("api/following/<str:target_username>/tamagotchi/", tamagotchi_views.FollowingTamagotchiView.as_view(), name="following_tamagotchi"),
    path("api/following/<str:target_username>/coins/", user_views.FollowingCoinsView.as_view(), name="following_coins"),
    path('api/notifications/', user_views.NotificationsView.as_view(), name='notifications'),
]