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
    ActionPlanViewSet,
    download_attachment_respondent,
    PoloViewSet,
    MonthlyDashboardView,
    MonthlyDashboardExportView,
    CompanyMonthlyDetailView,
)
from .upload_views import UploadInitView, UploadChunkView, UploadCompleteView, FileDownloadView

# Criação do router para as views automáticas do DRF
router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'categories', CategoryQuestionViewSet)
router.register(r'subcategories', SubCategoryViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'forms', FormViewSet)
router.register(r'evaluation', EvaluationViewSet)
router.register(r'answers', AnswerViewSet)
router.register(r'action-plans', ActionPlanViewSet)
router.register(r"poles", PoloViewSet)


# Combinação de URLs do router com a nova rota customizada
urlpatterns = [
    path('', include(router.urls)),  # Inclui todas as rotas geradas pelo router
    path('dashboard/monthly/', MonthlyDashboardView.as_view(), name='dashboard-monthly'),
    path('dashboard/monthly/export/', MonthlyDashboardExportView.as_view(), name='dashboard-monthly-export'),
    path('companies/<int:company_id>/monthly-detail/', CompanyMonthlyDetailView.as_view(), name='company-monthly-detail'),
    path('download/attachment_respondent/<int:answer_id>/', download_attachment_respondent, name='download_attachment_respondent'),
    path('uploads/init/', UploadInitView.as_view(), name='upload-init'),
    path('uploads/<uuid:upload_id>/chunk/', UploadChunkView.as_view(), name='upload-chunk'),
    path('uploads/<uuid:upload_id>/complete/', UploadCompleteView.as_view(), name='upload-complete'),
    path('files/<uuid:file_id>/download/', FileDownloadView.as_view(), name='file-download'),
]
