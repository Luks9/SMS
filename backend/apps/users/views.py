#apps/users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import User
from .serializers import UserProfileSerializer, CustomLoginSerializer
from apps.core.serializers import CompanySerializer
from django.contrib.auth import authenticate, login

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request):
        user = request.user
        company = user.companies.first()
        company_data = CompanySerializer(company).data if company else None
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            'name': f'{user.first_name} {user.last_name}',
            "company": company_data,
        }

        serializer = self.serializer_class(user_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomLoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = CustomLoginSerializer

    def post(self, request):        
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return Response({"detail": "Token não fornecido."}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(" ")[1]
         
        user = authenticate(request, access_token=token.encode("utf-8"))
        if user is not None:
            is_empresa = user.groups.filter(name='empresa').exists()

            company = user.companies.first()
            company_data = CompanySerializer(company).data if company else None
            response_data = {
                'token': str(token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f'{user.first_name} {user.last_name}',
                    'company': company_data,
                },
            }
            
            response = Response(response_data, status=status.HTTP_200_OK)
            response.set_cookie(
                key='refreshToken',
                value=str(token),
                httponly=True,
                secure=True,
                samesite='Lax'
            )
            return response            
        else:
            return Response({"detail": "Token inválido ou usuário não autorizado."}, status=status.HTTP_401_UNAUTHORIZED)
         

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Busque o token de refresh no cookie
        refresh_token = request.COOKIES.get('refreshToken')

        if not refresh_token:
            return Response({"detail": "Token de refresh não encontrado."}, status=400)

        # Atualize o payload para usar o token do cookie
        request.data['refresh'] = refresh_token

        try:
            # Valida o token de refresh e pega o usuário associado
            refresh = RefreshToken(refresh_token)
            user = User.objects.get(id=refresh['user_id'])

            # Verifica se o usuário está ativo
            if not user.is_active:
                return Response({"detail": "Usuário inativo."}, status=403)

            # Continue com o fluxo padrão de renovação
            response = super().post(request, *args, **kwargs)

        except (InvalidToken, TokenError) as e:
            return Response({"detail": "Token inválido ou expirado."}, status=401)

        return response
