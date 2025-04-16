from rest_framework import viewsets
from drf_spectacular.utils import extend_schema
from .models import Rem
from .serializers import RemSerializer

@extend_schema(tags=['REM'])
class RemViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de REM.
    """
    queryset = Rem.objects.all()
    serializer_class = RemSerializer

    def get_queryset(self):
        """
        Filtra os dados de REM com base no usuário autenticado.
        """
        user = self.request.user
        if user.is_superuser:
            return Rem.objects.all()
        return Rem.objects.filter(company__user=user)
