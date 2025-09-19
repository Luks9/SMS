# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
)
from .views import UserProfileView, CustomLoginView, CustomTokenRefreshView, UserListView, UserDetailView, UserUpdateView, GroupListView, UserGroupManagementView

urlpatterns = [
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # Rota para obter o token
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('list/', UserListView.as_view(), name='user_list'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user_detail'),
    path('users/<int:user_id>/update/', UserUpdateView.as_view(), name='user_update'),
    path('groups/', GroupListView.as_view(), name='group_list'),
    path('users/<int:user_id>/groups/', UserGroupManagementView.as_view(), name='user_group_management'),
]
