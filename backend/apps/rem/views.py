from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_200_OK
from rest_framework.decorators import action
from django.db import transaction
from .models import Rem, DieselConsumido, FuncionariosDemitidos
from .serializers import RemSerializer, DieselConsumidoSerializer, FuncionariosDemitidosSerializer
from apps.core.models import Company
from apps.users.utils.permissions import user_has_access_to_company
from rest_framework.exceptions import ValidationError

@extend_schema(tags=['REM'])
class RemViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de REM.
    """
    queryset = Rem.objects.all()
    serializer_class = RemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtra os dados de REM com base no usuário autenticado.
        """
        user = self.request.user
        if user.is_superuser:
            return Rem.objects.all()
        return Rem.objects.filter(company__user=user)

    def perform_create(self, serializer):
        """
        Define o comportamento ao criar um novo REM.
        """
        user = self.request.user
        company_id = self.request.data.get('company')
        if not company_id:
            raise ValidationError("O campo 'company' é obrigatório.")

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Empresa não encontrada.")

        # Usa a função user_has_access_to_company para validar acesso
        access = user_has_access_to_company(user, company)
        if access is not True:
            return access  # Retorna Response 403 se não tiver permissão

        serializer.save(company=company)

    @extend_schema(
        description="Retorna os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para todas as empresas.",
        responses={200: "Dados combinados retornados com sucesso."}
    )
    @action(detail=False, methods=['get'], url_path='combined-data')
    def combined_data_for_all_companies(self, request):
        """
        Endpoint para retornar todos os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para todas as empresas.
        """
        # Obtém todos os dados de REM, Diesel Consumido e Funcionários Demitidos

        polo_id = self.request.headers.get('X-Polo-Id')
        rems = Rem.objects.filter(company__poles__id=polo_id).order_by('-periodo', '-id')
        diesel_consumidos = DieselConsumido.objects.filter(company__poles__id=polo_id)
        funcionarios_demitidos = FuncionariosDemitidos.objects.filter(company__poles__id=polo_id)
        # Combina os dados
        combined_data = []
        for rem in rems:
            # Buscando Diesel Consumido e Funcionários Demitidos com o mesmo periodo
            diesel = diesel_consumidos.filter(periodo=rem.periodo, company=rem.company).first()
            demitidos = funcionarios_demitidos.filter(periodo=rem.periodo, company=rem.company).first()

            combined_data.append({
                "rem": RemSerializer(rem).data,
                "consumo_diesel": diesel.diesel_consumido if diesel else 0,
                "funcionarios_demitidos": demitidos.funcionarios_demitidos if demitidos else 0,
            })
        return Response(combined_data, status=HTTP_200_OK)

    @extend_schema(
        description="Cria um REM e distribui os dados adicionais para as tabelas DieselConsumido e FuncionariosDemitidos.",
        responses={201: "REM e dados adicionais criados com sucesso.", 400: "Erro de validação."}
    )
    @action(detail=False, methods=['post'], url_path='create-with-extras')
    def create_with_extras(self, request):
        """
        Endpoint para criar um REM e distribuir os dados adicionais para as tabelas DieselConsumido e FuncionariosDemitidos.
        """
        user = request.user
        data = request.data

        # Validações básicas
        company_id = data.get('company')
        periodo = data.get('periodo')
        if not company_id:
            return Response({"detail": "O campo 'company' é obrigatório."}, status=HTTP_400_BAD_REQUEST)
        if not periodo:
            return Response({"detail": "O campo 'periodo' é obrigatório."}, status=HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_400_BAD_REQUEST)

        # Verifica permissão de acesso à empresa
        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

        # Verifica se já existe um registro para o mesmo período e empresa
        if Rem.objects.filter(company=company, periodo=periodo).exists():
            return Response({"detail": "Já existe um registro de REM para este período e empresa."}, status=HTTP_400_BAD_REQUEST)
        if DieselConsumido.objects.filter(company=company, periodo=periodo).exists():
            return Response({"detail": "Já existe um registro de Diesel Consumido para este período e empresa."}, status=HTTP_400_BAD_REQUEST)
        if FuncionariosDemitidos.objects.filter(company=company, periodo=periodo).exists():
            return Response({"detail": "Já existe um registro de Funcionários Demitidos para este período e empresa."}, status=HTTP_400_BAD_REQUEST)

        # Criação do REM
        rem_serializer = RemSerializer(data=data, context={'request': request})
        if rem_serializer.is_valid():
            rem = rem_serializer.save(company=company)
        else:
            return Response(rem_serializer.errors, status=HTTP_400_BAD_REQUEST)

        # Criação do DieselConsumido
        diesel_data = {
            "periodo": periodo,
            "diesel_consumido": data.get('diesel_consumido', 0),
            "company": company.id
        }
        diesel_serializer = DieselConsumidoSerializer(data=diesel_data, context={'request': request})
        if diesel_serializer.is_valid():
            diesel_serializer.save(company=company)
        else:
            return Response(diesel_serializer.errors, status=HTTP_400_BAD_REQUEST)

        # Criação do FuncionariosDemitidos
        demitidos_data = {
            "periodo": periodo,
            "funcionarios_demitidos": data.get('funcionarios_demitidos', 0),
            "company": company.id
        }
        demitidos_serializer = FuncionariosDemitidosSerializer(data=demitidos_data, context={'request': request})
        if demitidos_serializer.is_valid():
            demitidos_serializer.save(company=company)
        else:
            return Response(demitidos_serializer.errors, status=HTTP_400_BAD_REQUEST)

        return Response({"detail": "REM e dados adicionais criados com sucesso."}, status=HTTP_201_CREATED)
    
    @extend_schema(
        description="Atualiza um REM existente e seus dados adicionais nas tabelas DieselConsumido e FuncionariosDemitidos.",
        responses={200: "REM e dados adicionais atualizados com sucesso.", 400: "Erro de validação.", 404: "REM não encontrado."}
    )
    @action(detail=True, methods=['patch'], url_path='update-with-extras')
    def update_with_extras(self, request, pk=None):
        """
        Endpoint para atualizar um REM e seus dados adicionais.
        """
        user = request.user
        data = request.data

        try:
            rem = Rem.objects.get(pk=pk)
        except Rem.DoesNotExist:
            return Response({"detail": "REM não encontrado."}, status=HTTP_404_NOT_FOUND)

        company_id = data.get('company', rem.company.id)
        periodo = data.get('periodo', rem.periodo)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_400_BAD_REQUEST)

        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

    
        with transaction.atomic():
            # Atualiza REM
            rem_serializer = RemSerializer(rem, data=data, partial=True, context={'request': request})
            if rem_serializer.is_valid():
                rem_serializer.save()
            else:
                return Response(rem_serializer.errors, status=HTTP_400_BAD_REQUEST)

            # Atualiza DieselConsumido
            try:
                diesel = DieselConsumido.objects.get(company=company, periodo=periodo)
                diesel_data = {
                    "periodo": periodo,
                    "diesel_consumido": data.get('diesel_consumido', diesel.diesel_consumido),
                    "company": company.id
                }
                diesel_serializer = DieselConsumidoSerializer(diesel, data=diesel_data, partial=True, context={'request': request})
                if diesel_serializer.is_valid():
                    diesel_serializer.save()
                else:
                    return Response(diesel_serializer.errors, status=HTTP_400_BAD_REQUEST)
            except DieselConsumido.DoesNotExist:
                return Response({"detail": "Registro de Diesel Consumido não encontrado."}, status=HTTP_404_NOT_FOUND)

            # Atualiza FuncionariosDemitidos
            try:
                demitidos = FuncionariosDemitidos.objects.get(company=company, periodo=periodo)
                demitidos_data = {
                    "periodo": periodo,
                    "funcionarios_demitidos": data.get('funcionarios_demitidos', demitidos.funcionarios_demitidos),
                    "company": company.id
                }
                demitidos_serializer = FuncionariosDemitidosSerializer(demitidos, data=demitidos_data, partial=True, context={'request': request})
                if demitidos_serializer.is_valid():
                    demitidos_serializer.save()
                else:
                    return Response(demitidos_serializer.errors, status=HTTP_400_BAD_REQUEST)
            except FuncionariosDemitidos.DoesNotExist:
                return Response({"detail": "Registro de Funcionários Demitidos não encontrado."}, status=HTTP_404_NOT_FOUND)

        return Response({"detail": "REM e dados adicionais atualizados com sucesso."}, status=HTTP_200_OK)

    @extend_schema(
        description="Retorna os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para uma empresa.",
        responses={200: "Dados combinados retornados com sucesso.", 404: "Empresa não encontrada."}
    )
    @action(detail=False, methods=['get'], url_path='combined-data/(?P<company_id>[^/.]+)')
    def combined_data_for_company(self, request, company_id=None):
        """
        Endpoint para retornar os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para uma empresa.
        """
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_404_NOT_FOUND)

        # Verifica permissão de acesso à empresa
        access = user_has_access_to_company(request.user, company)
        if access is not True:
            return access

        # Obtém os dados de REM, Diesel Consumido e Funcionários Demitidos
        rems = Rem.objects.filter(company=company).order_by('-periodo')
        diesel_consumidos = DieselConsumido.objects.filter(company=company)
        funcionarios_demitidos = FuncionariosDemitidos.objects.filter(company=company)

        # Combina os dados
        combined_data = []
        for rem in rems:
            diesel = diesel_consumidos.filter(periodo=rem.periodo).first()
            demitidos = funcionarios_demitidos.filter(periodo=rem.periodo).first()

            combined_data.append({
                "rem": RemSerializer(rem).data,
                "consumo_diesel": DieselConsumidoSerializer(diesel).data if diesel else None,
                "funcionarios_demitidos": FuncionariosDemitidosSerializer(demitidos).data if demitidos else None,
            })
        return Response(combined_data, status=HTTP_200_OK)

@extend_schema(tags=['Diesel Consumido'])
class DieselConsumidoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de Diesel Consumido.
    """
    queryset = DieselConsumido.objects.all()
    serializer_class = DieselConsumidoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return DieselConsumido.objects.all()
        return DieselConsumido.objects.filter(company__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        company_id = self.request.data.get('company')
        if not company_id:
            raise ValidationError("O campo 'company' é obrigatório.")

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Empresa não encontrada.")

        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

        serializer.save(company=company)

@extend_schema(tags=['Funcionarios Demitidos'])
class FuncionariosDemitidosViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de Funcionários Demitidos.
    """
    queryset = FuncionariosDemitidos.objects.all()
    serializer_class = FuncionariosDemitidosSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return FuncionariosDemitidos.objects.all()
        return FuncionariosDemitidos.objects.filter(company__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        company_id = self.request.data.get('company')
        if not company_id:
            raise ValidationError("O campo 'company' é obrigatório.")

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Empresa não encontrada.")

        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

        serializer.save(company=company)