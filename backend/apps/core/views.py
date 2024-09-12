#views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation
from .serializers import (
    CompanySerializer, 
    CategoryQuestionSerializer, 
    QuestionSerializer, 
    FormSerializer, 
    AnswerSerializer,
    SubcategorySerializer,
    EvaluationSerializer,
    EvaluationDetailSerializer,
    EvaluationProgressSerializer
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

        # Obter todas as avaliações da empresa
        evaluations = Evaluation.objects.filter(company=company)

        # Serializar as avaliações e retornar a resposta
        serializer = EvaluationSerializer(evaluations, many=True)
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
