from apps.core.models import Company
from django.contrib.auth.models import User, Group

def clean_username(username):
    """
    Limpa o username removendo tudo antes do # se existir
    
    Args:
        username: String do username original
        
    Returns:
        str: Username limpo
    """
    if not username:
        return None
    
    # Remove tudo antes do # se existir, mantendo apenas a parte do email
    if '#' in username:
        username = username.split('#')[-1]
    
    return username if '@' in username else None

def associate_user_with_company_by_domain(user):
    """
    Associa um usuário a uma empresa baseado no domínio do seu username (após o @)
    
    Args:
        user: Instância do usuário Django
        
    Returns:
        User: Usuário processado ou None se não encontrar correspondência
    """
    if not user.username:
        return None
    
    # Limpa o username primeiro
    cleaned_username = clean_username(user.username)
    if not cleaned_username:
        return None
    
    # Atualiza o username do usuário se foi alterado
    if cleaned_username != user.username:
        user.username = cleaned_username
        user.save()
    
    # Extrai o domínio do username limpo
    domain = cleaned_username.split('@')[1]
    
    try:
        if (domain == "bravaenergia.com" or cleaned_username == "jose.nunes@njb.com.br"):
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
                # Retorna o usuário com empresa já associada
                return user
                
    except Company.DoesNotExist:
        return None
    except Exception as e:
        print(f"Erro ao processar usuário {user.username}: {str(e)}")
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
    cleaned_username = clean_username(username)
    if cleaned_username and '@' in cleaned_username:
        return cleaned_username.split('@')[1]
    return None