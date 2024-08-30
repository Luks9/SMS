from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation
from .serializers import (
    CompanySerializer, 
    CategoryQuestionSerializer, 
    QuestionSerializer, 
    FormSerializer, 
    AnswerSerializer,
    SubcategorySerializer,
    EvaluationSerializer
)

@extend_schema(tags=['Empresas'])
class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer


    # @action(detail=False, methods=['get'])
    # def custom_action_teste(self, request):
    #     data = {'message': 'Isso é uma ação customizada!'}
    #     return Response(data)


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


@extend_schema(tags=['Respostas'])
class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
