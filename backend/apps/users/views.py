#apps/users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import User, Group
from django.db.models import Q, Value
from django.db.models.functions import Coalesce, Lower
from django.db import transaction
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


def _compute_scoped_company_changes(current_company_ids, scoped_company_ids, requested_company_ids):
    current_set = set(current_company_ids or [])
    scoped_set = set(scoped_company_ids or [])
    requested_set = set(requested_company_ids or [])

    remove_ids = (current_set & scoped_set) - requested_set
    add_ids = requested_set - current_set
    return remove_ids, add_ids


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
    authentication_classes = []
    serializer_class = CustomLoginSerializer

    def post(self, request):
        auth_header = request.headers.get('Authorization', '')
        scheme, _, adfs_token = auth_header.partition(' ')

        if scheme.lower() != 'bearer' or not adfs_token:
            return Response({"detail": "Token nao fornecido."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            # Keep token as str; django-auth-adfs expects a textual JWT.
            user = authenticate(request, access_token=adfs_token)
            if user is not None:
                logger.info(f"Login bem-sucedido: {user.username}")

                # Reprocessamento emergencial apenas se usuario empresa estiver sem empresa associada.
                # Grupo ausente nao deve impedir autenticacao.
                if not user.is_superuser and not user.companies.exists():
                    logger.warning(f"Usuario sem empresa vinculada, tentando associacao por dominio: {user.username}")
                    processed_user = associate_user_with_company_by_domain(user)
                    if processed_user is None or not processed_user.companies.exists():
                        return Response({
                            "detail": "Usuario nao possui empresa valida associada no sistema.",
                            "username": user.username
                        }, status=status.HTTP_403_FORBIDDEN)
                    user = processed_user
                elif not user.is_superuser and not user.groups.exists():
                    logger.warning(f"Usuario autenticado sem grupos (login permitido): {user.username}")

                # Busca todas as empresas do usuario
                companies = user.companies.all() if not user.is_superuser else []
                companies_data = CompanySerializer(companies, many=True).data

                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                response_data = {
                    'token': access_token,
                    'refresh': str(refresh),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'name': f'{user.first_name} {user.last_name}'.strip(),
                        'companies': companies_data,
                        'is_superuser': user.is_superuser,
                        'is_staff': user.is_staff,
                        'groups': list(user.groups.values_list('name', flat=True)),
                    },
                }

                response = Response(response_data, status=status.HTTP_200_OK)
                response.set_cookie(
                    key='refreshToken',
                    value=str(refresh),
                    httponly=True,
                    secure=True,
                    samesite='Lax'
                )
                return response

            return Response({"detail": "Token invalido ou usuario nao autorizado."}, status=status.HTTP_401_UNAUTHORIZED)

        except Exception as e:
            logger.exception(f"Erro no login: {str(e)}")
            return Response({
                "detail": "Erro interno durante o login.",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refreshToken')

        if not refresh_token:
            return Response({"detail": "Token de refresh nao encontrado."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            user = User.objects.get(id=refresh['user_id'])

            if not user.is_active:
                return Response({"detail": "Usuario inativo."}, status=status.HTTP_403_FORBIDDEN)
        except (InvalidToken, TokenError):
            return Response({"detail": "Token invalido ou expirado."}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({"detail": "Usuario nao encontrado."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data={'refresh': str(refresh_token)})

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        response_data = serializer.validated_data
        response = Response(response_data, status=status.HTTP_200_OK)

        new_refresh_token = response_data.get('refresh')
        if new_refresh_token:
            response.set_cookie(
                key='refreshToken',
                value=new_refresh_token,
                httponly=True,
                secure=True,
                samesite='Lax'
            )

        return response

class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pagination_class = StandardResultsSetPagination()
        users = User.objects.all()
        pole_id = request.headers.get('X-Polo-Id')

        # Verificar o tipo de filtro primeiro
        user_type = request.query_params.get('user_type', '').strip().lower()

        # Para listas regulares, aplicar contexto do polo selecionado.
        if user_type != 'sem_polo' and pole_id:
            users = users.filter(
                Q(companies__poles__id=pole_id) |
                Q(poles__id=pole_id)
            )

        # Aplicar filtros de tipo de usuario
        if user_type == 'avaliador':
            users = users.filter(is_superuser=True)
        elif user_type == 'empresa':
            users = users.filter(is_superuser=False)
        elif user_type == 'sem_polo':
            # "Sem polo" relativo ao contexto: sem vinculo com o polo selecionado.
            users = users.filter(is_active=True)
            if pole_id:
                users = users.exclude(
                    Q(companies__poles__id=pole_id) |
                    Q(poles__id=pole_id)
                )
            else:
                # Fallback sem contexto selecionado: sem vinculo de polo em nenhum lugar.
                users = users.filter(
                    poles__isnull=True,
                    companies__poles__isnull=True,
                )

        search = request.query_params.get('search', '').strip()
        if search:
            normalized_search = search.lower()
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(companies__name__icontains=search) |
                Q(groups__name__icontains=search) |
                Q(poles__name__icontains=search)
            )

            if normalized_search in {'ativo', 'active'}:
                users = users.filter(is_active=True)
            elif normalized_search in {'inativo', 'inactive'}:
                users = users.filter(is_active=False)
            elif normalized_search in {'avaliador', 'admin', 'superuser'}:
                users = users.filter(is_superuser=True)
            elif normalized_search in {'empresa', 'company'}:
                users = users.filter(is_superuser=False)

        users = users.distinct().prefetch_related(
            'companies__poles',
            'poles',
            'groups',
        ).annotate(
            first_name_sort=Lower(Coalesce('first_name', Value(''))),
            last_name_sort=Lower(Coalesce('last_name', Value(''))),
            username_sort=Lower(Coalesce('username', Value(''))),
        ).order_by('first_name_sort', 'last_name_sort', 'username_sort')

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

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from apps.core.models import Company, Polo

        with transaction.atomic():
            serializer.save()

            # Atualizacao de empresas isolada por polo (nunca global por usuario).
            if not user.is_superuser and 'company_ids' in request.data:
                raw_company_ids = request.data.get('company_ids', [])
                try:
                    requested_company_ids = {int(company_id) for company_id in raw_company_ids}
                except (TypeError, ValueError):
                    return Response(
                        {'error': 'company_ids invalido. Envie uma lista de IDs de empresas.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                active_polo_id = request.data.get('active_polo_id') or request.headers.get('X-Polo-Id')
                if not active_polo_id:
                    return Response(
                        {'error': 'Contexto de polo obrigatorio para editar empresas deste usuario.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    active_polo_id = int(active_polo_id)
                except (TypeError, ValueError):
                    return Response(
                        {'error': 'active_polo_id invalido.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                active_polo = Polo.objects.filter(id=active_polo_id, is_active=True).first()
                if not active_polo:
                    return Response(
                        {'error': 'Polo ativo nao encontrado.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                scoped_company_ids = set(
                    Company.objects.filter(poles__id=active_polo_id).values_list('id', flat=True)
                )

                invalid_ids = requested_company_ids - scoped_company_ids
                if invalid_ids:
                    return Response(
                        {
                            'error': 'Uma ou mais empresas nao pertencem ao polo em edicao.',
                            'invalid_company_ids': sorted(invalid_ids),
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                current_company_ids = set(user.companies.values_list('id', flat=True))
                remove_ids, add_ids = _compute_scoped_company_changes(
                    current_company_ids=current_company_ids,
                    scoped_company_ids=scoped_company_ids,
                    requested_company_ids=requested_company_ids,
                )

                if remove_ids:
                    user.companies.remove(*Company.objects.filter(id__in=remove_ids))
                if add_ids:
                    user.companies.add(*Company.objects.filter(id__in=add_ids))

            # Superusers mantem gestao de polos explicita.
            polo_ids = request.data.get('polo_ids', None)
            if polo_ids is not None and user.is_superuser:
                try:
                    polos = Polo.objects.filter(id__in=polo_ids)
                    if polos.count() != len(polo_ids):
                        return Response(
                            {'error': 'Um ou mais polos nao foram encontrados'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    user.poles.set(polos)
                except Exception as e:
                    return Response(
                        {'error': f'Erro ao associar polos: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

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




