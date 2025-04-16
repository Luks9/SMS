from rest_framework.routers import DefaultRouter
from .views import RemViewSet

router = DefaultRouter()
router.register(r'rems', RemViewSet, basename='rem')

urlpatterns = router.urls