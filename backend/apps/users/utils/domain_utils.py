from apps.core.models import Company
from django.contrib.auth.models import User, Group

def associate_user_with_company_by_domain(user):
    """
    Associa um usuário a uma empresa baseado no domínio do seu username (após o @)
    
    Args:
        user: Instância do usuário Django
        
    Returns:
        Company: Empresa associada ou None se não encontrar correspondência
    """
    if not user.username or '@' not in user.username:
        return None
    
    # Extrai o domínio do username (parte após o @)
    domain = user.username.split('@')[1]
    
    try:
        if (domain == "bravaenergia.com" or user.username == "jose.nunes@njb.com.br"):
            user.is_staff = True
            user.is_superuser = True
            user.companies.update(user=None)
            user.groups.clear()
            user.save()
            return user

        # Busca uma empresa com o domínio correspondente
        company = Company.objects.filter(dominio=domain, is_active=True).first()

        if company:
            # Verifica se o usuário já não tem nenhuma empresa associada
            if not user.companies.exists():
                # Adiciona o usuário ao grupo "empresa" apenas se não estiver em nenhum grupo
                if not user.groups.exists():
                    empresa_group, _ = Group.objects.get_or_create(name="empresa")
                    user.groups.add(empresa_group)
                
                # Associa o usuário à empresa
                company.user = user
                company.save()
                user.save()
                return user
            else:
                # Retorna a primeira empresa já associada
                return user
                
    except Company.DoesNotExist:
        return None
    
    return None


def get_domain_from_username(username):
    """
    Extrai o domínio de um username (parte após o @)
    
    Args:
        username: String do username
        
    Returns:
        str: Domínio ou None se não encontrar @
    """
    if '@' in username:
        return username.split('@')[1]
    return None