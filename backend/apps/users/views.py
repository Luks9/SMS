# apps/accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        print(user)
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            # Adicione outros campos conforme necessário
        }
        return Response(user_data, status=status.HTTP_200_OK)


class CustomLoginView(APIView):
    permission_classes = [AllowAny]  # Permite acesso sem autenticação


    def post(self, request):
        print("entrou")
        username = request.data.get('username')
        password = request.data.get('password')
        print(request)
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Gerar o token JWT
            refresh = RefreshToken.for_user(user)
            print(user.first_name)
            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f'{user.first_name} {user.last_name}'
                    # Adicione mais campos do usuário se necessário
                },
                'token': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_200_OK)
        else:
            return Response({'detail': 'Credenciais inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
