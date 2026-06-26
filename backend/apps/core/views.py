#apps/core/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
import os
from apps.users.utils.permissions import user_has_access_to_company
from django.http import FileResponse, Http404, HttpResponse
from .utils import export_pdf as generate_pdf_report, export_xlsx as generate_xlsx_report
from django.shortcuts import get_object_or_404
from django.db.models import Exists, OuterRef, Q, Count, Max
from django.db.models.deletion import ProtectedError
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation, ActionPlan, Polo, StoredFile
from .serializers import (
    CompanySerializer, 
    CategoryQuestionSerializer, 
    QuestionSerializer, 
    FormSerializer, 
    AnswerSerializer,
    SubcategorySerializer,
    EvaluationSerializer,
    EvaluationDetailSerializer,
    EvaluationProgressSerializer,
    ActionPlanSerializer,
    ScoreResponseSerializer,
    PoloSerializer
)
from rest_framework.pagination import PageNumberPagination
import mimetypes
from django.conf import settings
from django.utils import timezone
from datetime import datetime
import csv
from .upload_service import upload_uploaded_file_directly
from .storage.onedrive.client import OneDriveClient

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


def _safe_month_year(month_raw, year_raw):
    today = timezone.now().date()
    month = today.month
    year = today.year
    try:
        parsed_month = int(month_raw) if month_raw is not None else month
    except (TypeError, ValueError):
        parsed_month = month
    try:
        parsed_year = int(year_raw) if year_raw is not None else year
    except (TypeError, ValueError):
        parsed_year = year

    if parsed_month < 1 or parsed_month > 12:
        parsed_month = month
    if parsed_year < 2000 or parsed_year > 2100:
        parsed_year = year
    return parsed_month, parsed_year


def _company_abbreviation(name):
    if not name:
        return ""
    parts = [chunk for chunk in name.strip().split() if chunk]
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0][:4].upper()
    return "".join(part[0].upper() for part in parts[:4])


def _resolve_action_dashboard_status(action, today):
    is_pending = action.status != "COMPLETED"
    has_evidence = bool(action.attachment or action.attachment_file_id)
    has_response = bool(action.response_company or action.response_choice or action.response_date)

    if is_pending and action.end_date and action.end_date < today:
        return "overdue"
    if is_pending and not has_evidence:
        return "awaiting_evidence"
    if is_pending and has_response:
        return "awaiting_validation"
    if is_pending:
        return "pending"
    return "completed"


def _dashboard_data_for_user(user, *, pole_id=None, month=None, year=None, page=1, page_size=20):
    month, year = _safe_month_year(month, year)
    today = timezone.now().date()

    company_qs = Company.objects.filter(is_active=True).prefetch_related("poles")
    if user.is_superuser:
        if pole_id:
            company_qs = company_qs.filter(poles__id=pole_id)
    else:
        company_qs = company_qs.filter(users=user)

    company_qs = company_qs.distinct().order_by("name")
    eligible_company_ids = list(company_qs.values_list("id", flat=True))
    eligible_total = len(eligible_company_ids)

    evaluations_qs = Evaluation.objects.filter(
        is_active=True,
        period__month=month,
        period__year=year,
        company_id__in=eligible_company_ids,
    )

    eval_agg = {
        item["company_id"]: item
        for item in evaluations_qs.values("company_id").annotate(
            total=Count("id"),
            completed=Count("id", filter=Q(status="COMPLETED")),
            in_progress=Count("id", filter=Q(status__in=["IN_PROGRESS", "PENDING", "EXPIRED"])),
            latest_created=Max("created_at"),
            latest_completed=Max("completed_at"),
        )
    }
    score_agg = {
        item["company_id"]: item["latest_score"]
        for item in evaluations_qs.values("company_id").annotate(latest_score=Max("score"))
    }
    latest_eval_map = {}
    for item in evaluations_qs.order_by("company_id", "-created_at", "-id").values("id", "company_id"):
        if item["company_id"] not in latest_eval_map:
            latest_eval_map[item["company_id"]] = item["id"]

    actions_qs = ActionPlan.objects.filter(
        evaluation__is_active=True,
        evaluation__period__month=month,
        evaluation__period__year=year,
        company_id__in=eligible_company_ids,
    ).select_related("company", "responsible", "evaluation")

    action_count_map = {
        item["company_id"]: item
        for item in actions_qs.values("company_id").annotate(
            pending=Count("id", filter=~Q(status="COMPLETED")),
            overdue=Count("id", filter=~Q(status="COMPLETED") & Q(end_date__lt=today)),
        )
    }
    latest_action_map = {}
    for action in actions_qs.order_by("company_id", "end_date", "-id").values("id", "company_id"):
        if action["company_id"] not in latest_action_map:
            latest_action_map[action["company_id"]] = action["id"]

    companies_full = list(company_qs)
    company_rows = []
    not_started_list = []
    in_progress_list = []
    completed_list = []

    for company in companies_full:
        eval_info = eval_agg.get(company.id, {})
        total_eval = eval_info.get("total", 0)
        completed_eval = eval_info.get("completed", 0)
        in_progress_eval = eval_info.get("in_progress", 0)

        if total_eval == 0:
            status_key = "not_started"
            status_label = "Nao iniciada"
            not_started_list.append(company)
        elif completed_eval == total_eval:
            status_key = "completed"
            status_label = "Concluida"
            completed_list.append(company)
        else:
            status_key = "in_progress"
            status_label = "Em andamento"
            in_progress_list.append(company)

        actions_info = action_count_map.get(company.id, {})
        pending_actions = actions_info.get("pending", 0)
        overdue_actions = actions_info.get("overdue", 0)
        latest_update = eval_info.get("latest_completed") or eval_info.get("latest_created")

        company_rows.append(
            {
                "company_id": company.id,
                "company_name": company.name,
                "company_abbr": _company_abbreviation(company.name),
                "company_cnpj": company.cnpj,
                "status": status_key,
                "status_label": status_label,
                "last_updated_at": latest_update,
                "score": score_agg.get(company.id),
                "actions_pending": pending_actions,
                "actions_overdue": overdue_actions,
                "total_evaluations": total_eval,
                "completed_evaluations": completed_eval,
                "in_progress_evaluations": in_progress_eval,
                "poles": [{"id": pole.id, "name": pole.name} for pole in company.poles.all()],
                "latest_evaluation_id": latest_eval_map.get(company.id),
                "latest_action_plan_id": latest_action_map.get(company.id),
            }
        )

    company_rows.sort(
        key=lambda row: (
            0 if row["actions_overdue"] > 0 else 1,
            row["last_updated_at"] or datetime(2999, 12, 31, tzinfo=timezone.get_current_timezone()),
            row["company_name"].lower(),
        )
    )

    start = max((page - 1) * page_size, 0)
    end = start + page_size
    paged_companies = company_rows[start:end]

    action_rows = []
    overdue_actions = []
    awaiting_validation_actions = []
    awaiting_evidence_actions = []
    for action in actions_qs.order_by("end_date", "id"):
        dashboard_status = _resolve_action_dashboard_status(action, today)
        item = {
            "id": action.id,
            "company_id": action.company_id,
            "company": action.company.name,
            "company_abbr": _company_abbreviation(action.company.name),
            "evaluation_id": action.evaluation_id,
            "description": action.description,
            "due_date": action.end_date,
            "status": dashboard_status,
            "type": "action_plan",
            "assigned_to": (
                action.responsible.get_full_name() or action.responsible.username
                if action.responsible
                else None
            ),
            "needs_review": dashboard_status == "awaiting_validation",
        }
        action_rows.append(item)
        if dashboard_status == "overdue":
            overdue_actions.append(item)
        if dashboard_status == "awaiting_validation":
            awaiting_validation_actions.append(item)
        if dashboard_status == "awaiting_evidence":
            awaiting_evidence_actions.append(item)

    actions_pending_total = len([item for item in action_rows if item["status"] != "completed"])
    actions_overdue_total = len(overdue_actions)

    inconsistency_rows = []
    companies_with_user_count = company_qs.annotate(user_count=Count("users", distinct=True))
    for company in companies_with_user_count:
        missing = []
        if company.user_count == 0:
            missing.append("Sem responsavel")
        if not company.dominio:
            missing.append("Sem dominio/e-mail")
        if missing:
            inconsistency_rows.append(
                {
                    "company_id": company.id,
                    "company_name": company.name,
                    "issues": missing,
                }
            )

    kpis = {
        "eligible": eligible_total,
        "completed": len(completed_list),
        "pending": len(not_started_list) + len(in_progress_list),
        "in_progress": len(in_progress_list),
        "not_started": len(not_started_list),
        "actions_pending": actions_pending_total,
        "actions_overdue": actions_overdue_total,
    }

    checklist = {
        "evaluations_not_started": [
            {"company_id": company.id, "company_name": company.name}
            for company in sorted(not_started_list, key=lambda x: x.name.lower())
        ],
        "evaluations_in_progress": [
            {"company_id": company.id, "company_name": company.name}
            for company in sorted(in_progress_list, key=lambda x: x.name.lower())
        ],
        "actions_overdue": overdue_actions,
        "actions_waiting_validation": awaiting_validation_actions,
        "evidences_pending": awaiting_evidence_actions,
        "data_inconsistencies": sorted(inconsistency_rows, key=lambda x: x["company_name"].lower()),
    }

    return {
        "month": month,
        "year": year,
        "kpis": kpis,
        "pagination": {
            "count": len(company_rows),
            "page": page,
            "page_size": page_size,
            "has_next": end < len(company_rows),
            "has_previous": page > 1,
        },
        "companies": paged_companies,
        "companies_full": company_rows,
        "actions": action_rows,
        "checklist": checklist,
    }

def get_content_type(file_path):
    """
    Retorna o Content-Type correto baseado na extensão do arquivo.
    Suporta: .pdf, .zip, .jpg, .jpeg, .png, .doc, .docx, .xlsx, .xls
    """
    content_type_map = {
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel'
    }
    
    # Obter extensão do arquivo
    _, ext = os.path.splitext(file_path)
    ext_lower = ext.lower()
    
    # Retornar content type específico ou usar mimetypes como fallback
    if ext_lower in content_type_map:
        return content_type_map[ext_lower]
    
    # Fallback para mimetypes.guess_type
    guessed_type, _ = mimetypes.guess_type(file_path)
    return guessed_type or 'application/octet-stream'


@extend_schema(tags=['Empresas'])
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    pagination_class = StandardResultsSetPagination

    def create(self, request, *args, **kwargs):
        """
        Override create to automatically associate company with polo and user from header
        """
        pole_id = request.headers.get('X-Polo-Id')
        
        # Create the company first
        response = super().create(request, *args, **kwargs)
        
        # If company was created successfully
        if response.status_code == status.HTTP_201_CREATED:
            company = Company.objects.get(id=response.data['id'])
            
            # Add polo association if provided
            if pole_id:
                try:
                    polo = Polo.objects.get(id=pole_id, is_active=True)
                    polo.companies.add(company)
                    polo.save()
                except Polo.DoesNotExist:
                    pass
                except Exception:
                    pass
            
            # If user is not superuser, automatically associate them with the company
            if not request.user.is_superuser:
                company.users.add(request.user)
        
        return response

    def get_queryset(self):
        """
        Override get_queryset to filter by user's companies if not superuser
        """
        queryset = Company.objects.all().order_by('name')
        pole_id = self.request.headers.get('X-Polo-Id')
        search = self.request.query_params.get('search', '').strip()

        if self.request.user.is_superuser:
            if pole_id:
                queryset = queryset.filter(poles__id=pole_id)
        else:
            # For non-superusers, only show companies they're associated with
            queryset = queryset.filter(users=self.request.user)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(cnpj__icontains=search)
                | Q(dominio__icontains=search)
            )

        return queryset.annotate(
            has_evaluations=Exists(
                Evaluation.objects.filter(company=OuterRef('pk'), is_active=True)
            )
        )

    def destroy(self, request, *args, **kwargs):
        company = self.get_object()
        has_evaluations = getattr(company, 'has_evaluations', None)
        if has_evaluations is None:
            has_evaluations = company.evaluations.filter(is_active=True).exists()

        if has_evaluations:
            return Response(
                {"detail": "Não é possível excluir empresas com avaliações ativas associadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Não é possível excluir empresas com avaliações ativas associadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )


    @extend_schema(
        description="Retorna todas as empresas do usuário sem paginação",
        parameters=[
            OpenApiParameter(
                name='is_active',
                description='Filtrar empresas por status ativo. Quando informado, o valor padrão é true.',
                required=False,
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
            ),
        ], 
        responses={200: CompanySerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='all')
    def all_companies(self, request):
        """
        Endpoint para retornar todas as empresas sem paginação
        """ 
        pole_id = self.request.headers.get('X-Polo-Id')
        is_active_param = request.query_params.get('is_active')

        
        if self.request.user.is_superuser:
            if pole_id:
                companies = Company.objects.filter(poles__id=pole_id).order_by('name')
            else:
                companies = Company.objects.all().order_by('name')
        else:
            companies = Company.objects.filter(users=self.request.user).order_by('name')

        if is_active_param is not None:
            should_filter_active = is_active_param.lower() in ['true', '1', 't', 'yes', 'on', '', True]
            if should_filter_active:
                companies = companies.filter(is_active=True)
            else:
                companies = companies.filter(is_active=False)
            
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        description="Retorna as empresas associadas ao usuário autenticado",
        responses={200: CompanySerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='my-companies')
    def my_companies(self, request):
        """
        Endpoint para retornar as empresas do usuário logado
        """
        companies = request.user.companies.filter(is_active=True).order_by('name')
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=['Categorias'])
class CategoryQuestionViewSet(viewsets.ModelViewSet):
    queryset = CategoryQuestion.objects.all()
    serializer_class = CategoryQuestionSerializer


@extend_schema(tags=['Subcategorias'])
class SubCategoryViewSet(viewsets.ModelViewSet):
    queryset = Subcategory.objects.all()
    serializer_class = SubcategorySerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='category',
                description='ID da categoria para filtrar as subcategorias',
                required=False,
                type=int,
                location=OpenApiParameter.QUERY,
            )
        ]
    )
    def get_queryset(self):
        category_id = self.request.query_params.get('category', None)
        if category_id:
            return Subcategory.objects.filter(category_id=category_id)
        return Subcategory.objects.all()
    

@extend_schema(tags=['Perguntas'])
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer


@extend_schema(tags=['Formulários'])
class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.all()
    serializer_class = FormSerializer

@extend_schema(tags=['Avaliações'])
class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        responses=ScoreResponseSerializer
    )
    @action(detail=True, methods=['get'], url_path='calculate-score')
    def calculate_score(self, request, pk=None):
        """
        Calcula a pontuação da avaliação com base nas respostas e no peso das categorias.
        """

        access_check = user_has_access_to_company(request.user)
        if access_check is not True:
            return access_check

        evaluation = self.get_object()

        # Pegamos todas as respostas associadas a essa avaliação
        answers = evaluation.answers.all()
        if not answers.exists():
            return Response({
                "detail": "Nenhuma resposta encontrada para esta avaliação."
            }, status=status.HTTP_404_NOT_FOUND)

        total_score = 100  # Pontuação acumulada

        for answer in answers:
            category_weight = answer.question.category.weight  # Peso da categoria da pergunta
            # Verifica se a resposta é "Certo" ou "Errado"
            if answer.answer_evaluator in ['NC']:
                # Se a resposta for considerada "Certo", somamos o peso da categoria à pontuação
                total_score -= category_weight
        # Verifica se o total_weight é maior que zero para evitar divisão por zero
       
        final_score = total_score

        evaluation.score = final_score
        evaluation.save()
        evaluation.refresh_status()
        
        # Retorna a pontuação calculada
        return Response({
            'evaluation_id': evaluation.id,
            'total_score': final_score,
            'message': 'Score atualizado com sucesso.'
        }, status=status.HTTP_200_OK)
    

    def create(self, request, *args, **kwargs):
        """
        Cria múltiplas avaliações em uma única transação, com validação de duplicatas
        """
        companies = request.data.get('companies', [])
        if not companies:
            return super().create(request, *args, **kwargs)

        created_evaluations = []

        try:
            base_data = request.data.copy()
            del base_data['companies']
            form_id = base_data.get('form')
            period = base_data.get('period')

            # Verifica duplicatas antes de iniciar a transação
            duplicate_companies = []
            for company_id in companies:
                existing = Evaluation.objects.filter(
                    company_id=company_id,
                    form_id=form_id,
                    period__startswith=period[:7], # Compara apenas ano e mês
                    is_active=True
                ).exists()
                
                if existing:
                    company = Company.objects.get(id=company_id)
                    duplicate_companies.append(company.name)

            if duplicate_companies:
                return Response({
                    'error': 'Avaliações duplicadas detectadas',
                    'message': f'Já existem avaliações para as empresas: {", ".join(duplicate_companies)} no período selecionado com o mesmo formulário.',
                    'duplicate_companies': duplicate_companies
                }, status=status.HTTP_400_BAD_REQUEST)

            # Se não houver duplicatas, prossegue com a criação
            from django.db import transaction
            with transaction.atomic():
                for company_id in companies:
                    evaluation_data = base_data.copy()
                    evaluation_data['company'] = company_id
                    
                    serializer = self.get_serializer(data=evaluation_data)
                    serializer.is_valid(raise_exception=True)
                    self.perform_create(serializer)
                    created_evaluations.append(serializer.data)

            return Response({
                'created': created_evaluations,
                'message': f'Criadas {len(created_evaluations)} avaliações com sucesso'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erro ao criar avaliações'
            }, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        queryset = Evaluation.objects.all()
        is_active = self.request.query_params.get('is_active')
        pole_id = self.request.headers.get('X-Polo-Id')
        search = self.request.query_params.get('search', '')

        if self.request.user.is_superuser:
            if pole_id:
                queryset = queryset.filter(company__poles__id=pole_id)
        else:
            queryset = queryset.filter(company__users=self.request.user)

        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)

        period_month = self.request.query_params.get('period_month')
        if period_month:
            try:
                month_int = int(period_month)
            except (TypeError, ValueError):
                month_int = None
            else:
                if 1 <= month_int <= 12:
                    queryset = queryset.filter(period__month=month_int)
        period_year = self.request.query_params.get('period_year')
        if period_year:
            try:
                year_int = int(period_year)
            except (TypeError, ValueError):
                year_int = None
            else:
                queryset = queryset.filter(period__year=year_int)

        if search:
            queryset = queryset.filter(
                company__name__icontains=search
            )

        return queryset.order_by('-period', '-id')


    @extend_schema(
        tags=['Avaliações'],
        description="Obtém os detalhes completos de uma avaliação, incluindo perguntas e respostas.",
        responses={200: EvaluationDetailSerializer}
    )
    @action(detail=True, methods=['get'], url_path='details')
    def details(self, request, pk=None):
        evaluation = self.get_object()
        serializer = EvaluationDetailSerializer(evaluation)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='progress')
    def progress(self, request, pk=None):
        evaluation = self.get_object()
        serializer = EvaluationProgressSerializer(evaluation)
        return Response(serializer.data)
    
    
    @action(detail=False, methods=['get'], url_path='evaluations-by-company/(?P<company_id>[^/.]+)')
    def evaluations_by_company(self, request, company_id=None):
        """
        Retorna todas as avaliações pertencentes a uma empresa com base no ID fornecido.
        """
        # Verificar se a empresa existe        
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        access_check = user_has_access_to_company(request.user, company)
        if access_check is not True:
            return access_check

        is_active = request.query_params.get('is_active', 'true').lower() == 'true'
        # Obter todas as avaliações da empresa
        evaluations = Evaluation.objects.filter(company=company, is_active = is_active).order_by('-period')

        # Serializar as avaliações e retornar a resposta
        serializer = EvaluationSerializer(evaluations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    


    @action(detail=True, methods=['get'], url_path='questions-with-answers')
    def questions_with_answers(self, request, pk=None):
        """
        Retorna todas as perguntas e respostas de uma avaliação específica, 
        desde que o usuário seja admin ou esteja associado à empresa correta.
        """
        evaluation = self.get_object()
        user = request.user

        # Verificar se o usuário é admin (superuser)
        if user.is_superuser:
            return self._get_evaluation_details(evaluation)

        # Verificar se o usuário está associado à empresa da avaliação
        if user.companies.filter(id=evaluation.company.id).exists():
            return self._get_evaluation_details(evaluation)

        # Se não tiver acesso, retorna erro de permissão
        return Response(
            {"detail": "Você não tem permissão para acessar esta avaliação."},
            status=status.HTTP_403_FORBIDDEN
        )

    def _get_evaluation_details(self, evaluation):
        """
        Função auxiliar para serializar e retornar os detalhes da avaliação
        """
        serializer = EvaluationDetailSerializer(evaluation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Avaliações'],
        description="Exporta os detalhes da avaliação em PDF.",
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Documento PDF")}
    )
    @action(detail=True, methods=['get'], url_path='export/pdf')
    def export_pdf(self, request, pk=None):
        evaluation = self.get_object()
        return generate_pdf_report(evaluation, request)

    @extend_schema(
        tags=['Avaliações'],
        description="Exporta os detalhes da avaliação em XLSX.",
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Planilha XLSX")}
    )
    @action(detail=True, methods=['get'], url_path='export/xlsx')
    def export_xlsx(self, request, pk=None):
        evaluation = self.get_object()
        return generate_xlsx_report(evaluation, request)


@extend_schema(tags=['Respostas'])
class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer

    def _strip_large_files_from_data(self, request):
        threshold_mb = getattr(settings, "LEGACY_MULTIPART_THRESHOLD_MB", 15)
        threshold = threshold_mb * 1024 * 1024
        data = request.data.copy()
        for field_name in ("attachment_respondent", "attachment_evaluator"):
            incoming_file = request.FILES.get(field_name)
            if incoming_file and incoming_file.size >= threshold:
                data.pop(field_name, None)
        return data

    def _handle_large_legacy_file(self, *, instance, request):
        threshold_mb = getattr(settings, "LEGACY_MULTIPART_THRESHOLD_MB", 15)
        threshold = threshold_mb * 1024 * 1024
        files_to_upload = []

        respondent = request.FILES.get("attachment_respondent")
        evaluator = request.FILES.get("attachment_evaluator")
        if respondent and respondent.size >= threshold:
            files_to_upload.append(("attachment_respondent_file", respondent, StoredFile.FieldSlot.ANSWER_RESPONDENT))
        if evaluator and evaluator.size >= threshold:
            files_to_upload.append(("attachment_evaluator_file", evaluator, StoredFile.FieldSlot.ANSWER_EVALUATOR))

        for target_field, uploaded_file, slot in files_to_upload:
            stored = upload_uploaded_file_directly(
                user=request.user,
                uploaded_file=uploaded_file,
                relative_path=f"answers/{instance.id}",
                company=instance.company,
                field_slot=slot,
            )
            setattr(instance, target_field, stored)

        if files_to_upload:
            update_fields = [field for field, _f, _slot in files_to_upload]
            instance.save(update_fields=update_fields)

    def perform_create(self, serializer):
        instance = serializer.save()
        self._handle_large_legacy_file(instance=instance, request=self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._handle_large_legacy_file(instance=instance, request=self.request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=self._strip_large_files_from_data(request))
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=self._strip_large_files_from_data(request), partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)


def download_attachment_respondent(request, answer_id):
    answer = get_object_or_404(Answer, pk=answer_id)
    if answer.attachment_respondent_file_id:
        if answer.attachment_respondent_file.provider == StoredFile.Provider.LOCAL:
            download_url = f"/api/files/{answer.attachment_respondent_file_id}/download/?mode=proxy"
        else:
            client = OneDriveClient()
            download_url, _meta = client.get_download_url(answer.attachment_respondent_file.provider_item_id)
        return HttpResponse(status=302, headers={"Location": download_url})

    file_path = answer.attachment_respondent.path  # Caminho absoluto no sistema de arquivos
    
    if not os.path.exists(file_path):
        raise Http404("Arquivo não existe no sistema.")
    
    # Obter o Content-Type correto
    content_type = get_content_type(file_path)
    
    response = FileResponse(open(file_path, 'rb'), content_type=content_type, as_attachment=True)
    response['Content-Disposition'] = f'attachment; filename="{os.path.basename(answer.attachment_respondent.name)}"'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


@extend_schema(tags=['Plano de Ação'])
class ActionPlanViewSet(viewsets.ModelViewSet):
    queryset = ActionPlan.objects.all()
    serializer_class = ActionPlanSerializer

    @extend_schema(
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Successful file download")}
    )
    @action(detail=True, methods=['get'], url_path='download_attachment_plan_action')
    def download_attachment_plan_action(self, request, pk=None):
        plan_action = get_object_or_404(ActionPlan, pk=pk)

        if plan_action.attachment_file_id:
            if plan_action.attachment_file.provider == StoredFile.Provider.LOCAL:
                download_url = f"/api/files/{plan_action.attachment_file_id}/download/?mode=proxy"
            else:
                client = OneDriveClient()
                download_url, _meta = client.get_download_url(plan_action.attachment_file.provider_item_id)
            return HttpResponse(status=302, headers={"Location": download_url})

        # Verifica se o anexo existe
        if not plan_action.attachment or not os.path.exists(plan_action.attachment.path):
            raise Http404("Anexo não encontrado.")

        # Obter o Content-Type correto
        file_path = plan_action.attachment.path
        content_type = get_content_type(file_path)
        
        # Retorna o arquivo diretamente com FileResponse com Content-Type correto
        response = FileResponse(open(file_path, 'rb'), content_type=content_type, as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(plan_action.attachment.name)}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


    @action(detail=True, methods=['get'], url_path='by-company')
    def by_company(self, request, pk=None):
        """
        Retorna todas os planos pertencentes a uma empresa com base no ID fornecido.
        """
        
        try:
            company = get_object_or_404(Company, pk=pk)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        
         # Verifica se o usuário tem acesso à empresa
        access_check = user_has_access_to_company(request.user, company)
        if access_check is not True:
            return access_check
        
        action_plans = ActionPlan.objects.filter(company=company)
        serializer = self.get_serializer(action_plans, many=True)
 
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def get_queryset(self):
        queryset = ActionPlan.objects.all()
        pole_id = self.request.headers.get('X-Polo-Id')
        
        if self.request.user.is_superuser:
            if pole_id:
                queryset = queryset.filter(company__poles__id=pole_id)
        else:
            # Filter by user's companies
            queryset = queryset.filter(company__users=self.request.user)
            
        return queryset


@extend_schema(tags=["Polos"])
class PoloViewSet(viewsets.ModelViewSet):
    queryset = Polo.objects.all().prefetch_related('companies', 'superusers')
    serializer_class = PoloSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset().order_by('name')
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(superusers=self.request.user)
    
    @extend_schema(
        description='Retorna os polos associados ao usuário autenticado.',
        responses={200: PoloSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='my-poles')
    def my_poles(self, request):
        poles = Polo.objects.filter(
            users=request.user,
            is_active=True
        ).order_by('name')
        serializer = self.get_serializer(poles, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='all')
    def all_polos(self, request):
        polos = Polo.objects.filter(is_active=True)
        serializer = self.get_serializer(polos, many=True)
        return Response(serializer.data)


class MonthlyDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        pole_id = request.headers.get("X-Polo-Id")
        try:
            page = int(request.query_params.get("page", 1))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(request.query_params.get("page_size", 20))
        except (TypeError, ValueError):
            page_size = 20
        page = 1 if page < 1 else page
        page_size = 20 if page_size < 1 else min(page_size, 100)

        payload = _dashboard_data_for_user(
            request.user,
            pole_id=pole_id,
            month=month,
            year=year,
            page=page,
            page_size=page_size,
        )
        return Response(payload, status=status.HTTP_200_OK)


class MonthlyDashboardExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        pole_id = request.headers.get("X-Polo-Id")
        payload = _dashboard_data_for_user(
            request.user,
            pole_id=pole_id,
            month=month,
            year=year,
            page=1,
            page_size=100000,
        )

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="dashboard_mensal_{payload["year"]}_{payload["month"]:02d}.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "Empresa",
                "Abreviacao",
                "Status Avaliacao",
                "Ultima Atualizacao",
                "Pontuacao",
                "Acoes Pendentes",
                "Acoes Vencidas",
                "Polos",
            ]
        )
        for item in payload["companies_full"]:
            writer.writerow(
                [
                    item["company_name"],
                    item["company_abbr"],
                    item["status_label"],
                    item["last_updated_at"].strftime("%Y-%m-%d %H:%M:%S") if item["last_updated_at"] else "",
                    item["score"] if item["score"] is not None else "",
                    item["actions_pending"],
                    item["actions_overdue"],
                    ", ".join(polo["name"] for polo in item["poles"]),
                ]
            )
        return response


class CompanyMonthlyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, company_id):
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        month, year = _safe_month_year(month, year)

        company = get_object_or_404(Company.objects.prefetch_related("users", "poles"), id=company_id, is_active=True)
        access_check = user_has_access_to_company(request.user, company)
        if access_check is not True:
            return access_check

        evaluations = Evaluation.objects.filter(
            company_id=company.id,
            is_active=True,
            period__month=month,
            period__year=year,
        ).select_related("evaluator", "form").order_by("-created_at")

        actions = ActionPlan.objects.filter(
            company_id=company.id,
            evaluation__is_active=True,
            evaluation__period__month=month,
            evaluation__period__year=year,
        ).select_related("responsible", "evaluation").order_by("end_date", "id")

        today = timezone.now().date()
        action_rows = []
        for action in actions:
            action_rows.append(
                {
                    "id": action.id,
                    "description": action.description,
                    "status": _resolve_action_dashboard_status(action, today),
                    "raw_status": action.status,
                    "due_date": action.end_date,
                    "responsible": (
                        action.responsible.get_full_name() or action.responsible.username
                        if action.responsible
                        else None
                    ),
                    "has_evidence": bool(action.attachment or action.attachment_file_id),
                    "response_date": action.response_date,
                    "evaluation_id": action.evaluation_id,
                }
            )

        pending_questions = []
        for evaluation in evaluations:
            total = evaluation.total_questions_count
            answered = evaluation.respondent_answers_count
            if answered < total:
                pending_questions.append(
                    {
                        "evaluation_id": evaluation.id,
                        "form_name": evaluation.form.name,
                        "answered_questions": answered,
                        "total_questions": total,
                        "pending_questions": max(total - answered, 0),
                    }
                )

        payload = {
            "company": {
                "id": company.id,
                "name": company.name,
                "abbreviation": _company_abbreviation(company.name),
                "poles": [{"id": pole.id, "name": pole.name} for pole in company.poles.all()],
            },
            "month": month,
            "year": year,
            "summary": {
                "total_evaluations": evaluations.count(),
                "completed": evaluations.filter(status="COMPLETED").count(),
                "in_progress": evaluations.exclude(status="COMPLETED").count(),
                "responsibles": sorted(
                    {
                        (evaluation.evaluator.get_full_name() or evaluation.evaluator.username)
                        for evaluation in evaluations
                    }
                ),
            },
            "evaluations": [
                {
                    "id": evaluation.id,
                    "status": evaluation.status,
                    "created_at": evaluation.created_at,
                    "completed_at": evaluation.completed_at,
                    "valid_until": evaluation.valid_until,
                    "score": evaluation.score,
                    "form_name": evaluation.form.name,
                    "evaluator": evaluation.evaluator.get_full_name() or evaluation.evaluator.username,
                }
                for evaluation in evaluations
            ],
            "pending_items": pending_questions,
            "actions": action_rows,
        }
        return Response(payload, status=status.HTTP_200_OK)
