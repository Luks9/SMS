from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .serializers import UserProfileSerializer, CustomLoginSerializer


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer  # Adicione o serializer_class aqui

    def get(self, request):
        user = request.user
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            # Adicione outros campos conforme necessário
        }
        serializer = self.serializer_class(user_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomLoginView(APIView):
    permission_classes = [AllowAny]  # Permite acesso sem autenticação
    serializer_class = CustomLoginSerializer  # Adicione o serializer_class aqui

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Gerar o token JWT
            refresh = RefreshToken.for_user(user)
            response_data = {
                'token': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f'{user.first_name} {user.last_name}'
                },
            }
            serializer = self.serializer_class(response_data)
            response = Response(serializer.data, status=status.HTTP_200_OK)
            response.set_cookie(
                key='refreshToken',
                value=str(refresh),
                httponly=True,  # Impede o acesso via JavaScript
                secure=True,  # Apenas em HTTPS
                samesite='Lax'
            )
            return response
        
        else:
            return Response({'detail': 'Credenciais inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Busque o token de refresh no cookie
        refresh_token = request.COOKIES.get('refreshToken')
        
        if not refresh_token:
            return Response({"detail": "Token de refresh não encontrado."}, status=400)

        # Atualize o payload para usar o token do cookie
        request.data['refresh'] = refresh_token

        # Continue com o fluxo padrão de renovação
        try:
            response = super().post(request, *args, **kwargs)
        except (InvalidToken, TokenError) as e:
            return Response({"detail": "Token inválido ou expirado."}, status=401)

        return response
