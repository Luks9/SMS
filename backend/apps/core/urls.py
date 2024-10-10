#apps/core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, 
    CategoryQuestionViewSet, 
    QuestionViewSet, 
    FormViewSet, 
    AnswerViewSet,
    SubCategoryViewSet,
    EvaluationViewSet,
    download_attachment_respondent,
)

# Criação do router para as views automáticas do DRF
router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'categories', CategoryQuestionViewSet)
router.register(r'subcategories', SubCategoryViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'forms', FormViewSet)
router.register(r'evaluation', EvaluationViewSet)
router.register(r'answers', AnswerViewSet)

# Combinação de URLs do router com a nova rota customizada
urlpatterns = [
    path('', include(router.urls)),  # Inclui todas as rotas geradas pelo router
    path('download/attachment_respondent/<int:answer_id>/', download_attachment_respondent, name='download_attachment_respondent'),
]
