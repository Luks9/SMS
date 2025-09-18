# apps/users/utils/permissions.py

from rest_framework.response import Response
from rest_framework import status 


def user_has_access_to_company(user, company=None):
    """
    Verifica se um usuário tem acesso a uma empresa específica.
    Se company for None, verifica se o usuário tem acesso a pelo menos uma empresa.
    """
    if user.is_superuser:
        return True
    
    if company is None:
        # Verifica se o usuário está associado a pelo menos uma empresa ativa
        return user.companies.filter(is_active=True).exists()
    
    # Verifica se o usuário está associado à empresa específica
    if user.companies.filter(id=company.id, is_active=True).exists():
        return True
    
    return Response(
        {"detail": "Você não tem permissão para acessar esta empresa."},
        status=status.HTTP_403_FORBIDDEN
    )


def get_user_companies(user):
    """
    Retorna todas as empresas ativas associadas ao usuário.
    Para superusers, retorna todas as empresas ativas do sistema.
    """
    if user.is_superuser:
        from apps.core.models import Company
        return Company.objects.filter(is_active=True)
    
    return user.companies.filter(is_active=True)


def user_can_access_evaluation(user, evaluation):
    """
    Verifica se o usuário pode acessar uma avaliação específica.
    """
    if user.is_superuser:
        return True
    
    return user.companies.filter(id=evaluation.company.id, is_active=True).exists()
