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
        company = user.companies.first()
        if company:
            company_data = {
                "id": company.id,
                "name": company.name,
                # Adicione mais atributos da empresa se necessário
            }
        else:
            company_data = None  # Ou um dicionário vazio se preferir {}
        print(company_data)
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "company": company_data,
            # Adicione outros campos conforme necessário
        }

        serializer = self.serializer_class(user_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomLoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = CustomLoginSerializer

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            is_empresa = user.groups.filter(name='empresa').exists()

            refresh = RefreshToken.for_user(user)
            company = user.companies.first()  # Acessa a primeira empresa associada ao usuário

            response_data = {
                'token': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f'{user.first_name} {user.last_name}',
                    'company': company,  # Passe o objeto company diretamente
                },
            }

            serializer = self.serializer_class(response_data)
            response = Response(serializer.data, status=status.HTTP_200_OK)
            response.set_cookie(
                key='refreshToken',
                value=str(refresh),
                httponly=True,
                secure=True,
                samesite='Lax'
            )
            return response

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
