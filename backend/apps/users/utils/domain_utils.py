from apps.core.models import Company
from django.contrib.auth.models import User, Group
import logging

logger = logging.getLogger(__name__)

def clean_username(username):
    """
    Limpa o username removendo tudo antes do # se existir
    """
    if not username:
        return None
    
    if '#' in username:
        username = username.split('#')[-1]
    
    return username if '@' in username else None

def associate_user_with_company_by_domain(user):
    """
    Associa um usuário a uma empresa baseado no domínio do seu username
    EXCETO se for domínio "bravaenergia.com" ou superuser
    """
    if not user.username:
        logger.error(f"Usuário sem username: ID {user.id}")
        return None
    
    # Limpa o username se necessário (redundante, mas por segurança)
    cleaned_username = clean_username(user.username)
    if not cleaned_username:
        logger.error(f"Username inválido: {user.username}")
        return None
    
    if cleaned_username != user.username:
        user.username = cleaned_username
        user.save()
    
    try:
        domain = cleaned_username.split('@')[1]
        
        # Usuários administrativos especiais - SEM empresa associada
        if domain == "bravaenergia.com":
            
            #user.is_staff = True
            user.is_superuser = True
            # Remove qualquer empresa associada (se existir)
            user.companies.clear()
            # Remove de todos os grupos
            user.groups.clear()
            user.save()
            return user

        # Para outros domínios, busca empresa correspondente
        company = Company.objects.filter(dominio=domain, is_active=True).first()

        if company:
            
            # Associa o usuário à empresa
            empresa_group_id_1 = Group.objects.get(id=1)
            user.groups.add(empresa_group_id_1)
            company.user = user
            company.save()
            user.save()

            return user
        else:
            return None
                
    except Exception as e:
        logger.error(f"Erro ao processar usuário {cleaned_username}: {str(e)}")
        return None
