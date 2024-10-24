# apps/users/utils/permissions.py

from rest_framework.response import Response
from rest_framework import status
from django.http import Http404

def user_has_access_to_company(user, company):
    """
    Verifica se o usuário é admin ou se está associado à empresa.
    :param user: O usuário que está fazendo a requisição.
    :param company: A empresa que está sendo acessada.
    :return: Retorna True se o usuário for superusuário ou estiver associado à empresa.
             Caso contrário, retorna um Response com status 403 Forbidden.
    """
    # Verifica se o usuário é superusuário
    if user.is_superuser:
        return True

    # Verifica se o usuário está associado à empresa
    if hasattr(user, 'companies') and user.companies.filter(id=company.id).exists():
        return True

    # Se não for superusuário e não estiver associado, retorna um Response 403
    return Response(
        {"detail": "Você não tem permissão para acessar esta informação."},
        status=status.HTTP_403_FORBIDDEN
    )
