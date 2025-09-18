#apps/users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import User, Group
from django.db.models import Q
from .serializers import UserProfileSerializer, CustomLoginSerializer, UserSerializer, UserUpdateSerializer, GroupSerializer, UserGroupSerializer
from apps.core.serializers import CompanySerializer
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from apps.users.utils.domain_utils import associate_user_with_company_by_domain
import logging

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request):
        user = request.user
        companies = user.companies.all() if not user.is_superuser else []
        companies_data = CompanySerializer(companies, many=True).data
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            'name': f'{user.first_name} {user.last_name}',
            "companies": companies_data,
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
        
        try:
            user = authenticate(request, access_token=token.encode("utf-8"))
            if user is not None:                
                logger.info(f"Login bem-sucedido: {user.username}")
                
                # Verificação final apenas para casos extremos
                if not user.is_superuser and (not user.companies.exists() or not user.groups.exists()):
                    logger.warning(f"Reprocessamento emergencial para {user.username}")
                    processed_user = associate_user_with_company_by_domain(user)
                    if processed_user is None:
                        return Response({
                            "detail": "Usuário não possui domínio de empresa válida.",
                            "username": user.username
                        }, status=status.HTTP_403_FORBIDDEN)
                    user = processed_user
                
                # Busca todas as empresas do usuário
                companies = user.companies.all() if not user.is_superuser else []
                companies_data = CompanySerializer(companies, many=True).data
                
                response_data = {
                    'token': str(token),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'name': f'{user.first_name} {user.last_name}'.strip(),
                        'companies': companies_data,
                        'is_superuser': user.is_superuser,
                        'groups': list(user.groups.values_list('name', flat=True)),
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
                
        except Exception as e:
            logger.error(f"Erro no login: {str(e)}")
            return Response({
                "detail": "Erro interno durante o login.",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
         

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


class UserListView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        pagination_class = StandardResultsSetPagination()
        users = User.objects.all()
        pole_id = request.headers.get('X-Polo-Id')
        if pole_id:
            users = User.objects.filter(
                Q(companies__poles__id=pole_id) |  # usuários de empresas do polo
                Q(poles__id=pole_id)
            ).distinct()

        paginated_users = pagination_class.paginate_queryset(users, request)
        serializer = UserSerializer(paginated_users, many=True)
        return pagination_class.get_paginated_response(serializer.data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Handle companies association (multiple companies)
            company_ids = request.data.get('company_ids', [])
            if company_ids and not user.is_superuser:
                from apps.core.models import Company
                try:
                    companies = Company.objects.filter(id__in=company_ids)
                    if companies.count() != len(company_ids):
                        return Response(
                            {'error': 'Uma ou mais empresas não foram encontradas'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    user.companies.set(companies)  # Set all companies at once
                except Exception as e:
                    return Response(
                        {'error': f'Erro ao associar empresas: {str(e)}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif user.is_superuser:
                # Superusers shouldn't have company associations
                user.companies.clear()
            
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        groups = Group.objects.all()
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserGroupManagementView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        serializer = UserGroupSerializer(data=request.data)
        
        if serializer.is_valid():
            group_ids = serializer.validated_data['group_ids']
            action = serializer.validated_data['action']
            
            groups = Group.objects.filter(id__in=group_ids)
            
            if action == 'add':
                user.groups.add(*groups)
                message = "Grupos adicionados com sucesso."
            elif action == 'remove':
                user.groups.remove(*groups)
                message = "Grupos removidos com sucesso."
            elif action == 'set':
                user.groups.set(groups)
                message = "Grupos atualizados com sucesso."
            
            # Retornar os dados atualizados do usuário
            user_serializer = UserSerializer(user)
            return Response({
                'message': message,
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)