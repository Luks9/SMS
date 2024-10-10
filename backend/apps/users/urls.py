# apps/users/urls.py
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
)
from .views import UserProfileView, CustomLoginView, CustomTokenRefreshView

urlpatterns = [
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # Rota para obter o token
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
]
