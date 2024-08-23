# apps/accounts/urls.py
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import UserProfileView, CustomLoginView

urlpatterns = [
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # Rota para obter o token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # Rota para atualizar o token
]
