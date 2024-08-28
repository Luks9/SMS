from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, 
    CategoryQuestionViewSet, 
    QuestionViewSet, 
    FormViewSet, 
    AnswerViewSet,
    SubCategoryViewSet,
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'categories', CategoryQuestionViewSet)
router.register(r'subcategories', SubCategoryViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'forms', FormViewSet)
router.register(r'answers', AnswerViewSet)

urlpatterns = router.urls
