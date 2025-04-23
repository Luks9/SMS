from rest_framework.routers import DefaultRouter
from .views import RemViewSet, DieselConsumidoViewSet, FuncionariosDemitidosViewSet

router = DefaultRouter()
router.register(r'rems', RemViewSet, basename='rem')
router.register(r'diesel-consumido', DieselConsumidoViewSet, basename='diesel-consumido')
router.register(r'funcionarios-demitidos', FuncionariosDemitidosViewSet, basename='funcionarios-demitidos')

urlpatterns = router.urls