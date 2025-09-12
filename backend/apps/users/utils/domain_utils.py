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
    EXCETO se for domínio "bravaenergia.com" (que são superusers)
    """
    if not user.username:
        logger.error(f"Usuário sem username: ID {user.id}")
        return None
    
    cleaned_username = clean_username(user.username)
    if not cleaned_username:
        logger.error(f"Username inválido: {user.username}")
        return None
    
    if cleaned_username != user.username:
        user.username = cleaned_username
        user.save(update_fields=['username'])
    
    try:
        domain = cleaned_username.split('@')[1]
        
        # Usuários administrativos especiais - SUPERUSERS
        if domain == "bravaenergia.com":
            user.is_superuser = True
            user.is_staff = True
            user.companies.clear()
            user.groups.clear()
            user.save(update_fields=['is_superuser', 'is_staff'])
            logger.info(f"Usuário {cleaned_username} configurado como superuser")
            return user

        # Busca empresa correspondente
        company = Company.objects.filter(dominio=domain, is_active=True).first()

        if company:
            user.is_superuser = False
            user.is_staff = False
            
            # Associa ao grupo empresa se necessário
            try:
                if not user.groups.filter(id=1).exists():
                    empresa_group = Group.objects.get(id=1)
                    user.groups.add(empresa_group)
                    logger.info(f"Usuário {cleaned_username} adicionado ao grupo empresa")
                    
            except Group.DoesNotExist:
                logger.error("Grupo 'empresa' (ID 1) não encontrado")
                return None
            
            # Associa à empresa se necessário
            if not user.companies.filter(id=company.id).exists():
                user.companies.clear()
                user.companies.add(company)
                logger.info(f"Usuário {cleaned_username} associado à empresa {company.name}")
            
            user.save(update_fields=['is_superuser', 'is_staff'])
            return user
        else:
            logger.warning(f"Empresa não encontrada para domínio: {domain}")
            return None
                
    except Exception as e:
        logger.error(f"Erro ao processar usuário {cleaned_username}: {str(e)}")
        return None
