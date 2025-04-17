#apps/core/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
import os
from apps.users.utils.permissions import user_has_access_to_company
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation, ActionPlan
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
)



@extend_schema(tags=['Empresas'])
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer


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

        total_score = 100  # Pontuação acumulada
        total_weight = 0  # Soma dos pesos das categorias

        for answer in answers:
            category_weight = answer.question.category.weight  # Peso da categoria da pergunta

            # Apenas incrementamos o peso total para perguntas que não sejam "NA"
            # total_weight += category_weight

            # Verifica se a resposta é "Certo" ou "Errado"
            if answer.answer_evaluator in ['NC']:
                # Se a resposta for considerada "Certo", somamos o peso da categoria à pontuação
                total_score -= category_weight

        # Verifica se o total_weight é maior que zero para evitar divisão por zero
        if total_weight > 0:
            # Calcula a porcentagem da pontuação final
            #final_score = (total_score / total_weight) * 100
            final_score = total_score
        else:
            final_score = 0  # Caso não haja respostas válidas

        evaluation.score = final_score
        evaluation.save()
        
        # Retorna a pontuação calculada
        return Response({
            'evaluation_id': evaluation.id,
            'total_score': final_score,
            'total_weight': total_weight,
            'message': 'Score atualizado com sucesso.'
        }, status=status.HTTP_200_OK)
    

    def get_queryset(self):
        """
        Sobrescreve o método get_queryset para filtrar as avaliações com base no parâmetro is_active.
        """
        queryset = Evaluation.objects.all()
        # Obtém o parâmetro `is_active` da URL
        is_active = self.request.query_params.get('is_active', None)

        # Se o parâmetro `is_active` for passado na URL, filtra com base no valor
        if is_active is not None:
            # Convertendo o valor do parâmetro para booleano
            if is_active.lower() == 'true':
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == 'false':
                queryset = queryset.filter(is_active=False)

        queryset = queryset.order_by('-period')

        return queryset


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

        # Verificar se o usuário pertence ao grupo "empresa" e está associado à empresa correta
        if user.groups.filter(name='empresa').exists() and hasattr(user, 'companies'):
            company = user.companies.first()  # Pega a primeira empresa associada ao usuário
            if evaluation.company == company:
                return self._get_evaluation_details(evaluation)

        # Se não for admin e não estiver associado à empresa correta, retorna erro de permissão
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


@extend_schema(tags=['Respostas'])
class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer


def download_attachment_respondent(request, answer_id):
    answer = get_object_or_404(Answer, pk=answer_id)
    file_path = answer.attachment_respondent.path  # Caminho absoluto no sistema de arquivos
    response = FileResponse(open(file_path, 'rb'))
    response['Content-Disposition'] = f'attachment; filename="{answer.attachment_respondent.name}"'
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

        # Verifica se o anexo existe
        if not plan_action.attachment or not os.path.exists(plan_action.attachment.path):
            raise Http404("Anexo não encontrado.")

        # Retorna o arquivo diretamente com FileResponse sem 'with open'
        response = FileResponse(open(plan_action.attachment.path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(plan_action.attachment.name)}"'
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