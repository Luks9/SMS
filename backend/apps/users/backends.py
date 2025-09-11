from django_auth_adfs.backend import AdfsAccessTokenBackend
from django.contrib.auth.models import User
from apps.users.utils.domain_utils import clean_username, associate_user_with_company_by_domain
from django_auth_adfs.config import Settings
import logging

logger = logging.getLogger(__name__)

class CustomAdfsBackend(AdfsAccessTokenBackend):
    """
    Backend customizado que limpa o username e associa empresa na criação
    """
    
    def __init__(self):
        super().__init__()
        self.settings = Settings()
    
    def create_user(self, claims):
        """
        Sobrescreve a criação do usuário para limpar o username e associar empresa
        """
        username = claims.get(self.settings.USERNAME_CLAIM, '')
        
        # Limpa o username antes de criar o usuário
        cleaned_username = clean_username(username)
        if not cleaned_username:
            logger.error(f"Username inválido após limpeza: {username}")
            return None
            
        
        # Substitui o claim do username pelo username limpo
        claims[self.settings.USERNAME_CLAIM] = cleaned_username
        
        # Chama o método pai para criar o usuário com username limpo
        user = super().create_user(claims)
        
        if user:
            # Associa empresa e grupos na criação
            processed_user = associate_user_with_company_by_domain(user)
            if processed_user:
                return processed_user
            else:
                # Retorna o usuário mesmo se não conseguir associar empresa
                return user
        
        return None
    
    def authenticate_user(self, user, claims):
        """
        Para usuários existentes, apenas verifica se o username precisa ser limpo
        """
        original_username = claims.get(self.settings.USERNAME_CLAIM, '')
        cleaned_username = clean_username(original_username)
        
        if cleaned_username and cleaned_username != user.username:
            user.username = cleaned_username
            user.save(update_fields=['username'])
        
        return super().authenticate_user(user, claims)
    
    def authenticate(self, request, access_token=None, **kwargs):
        """
        Método principal de autenticação com tratamento de erros melhorado
        """
        try:
            return super().authenticate(request, access_token=access_token, **kwargs)
        except Exception as e:
            logger.error(f"Erro na autenticação ADFS: {str(e)}")
            if hasattr(e, 'args') and e.args:
                logger.error(f"Detalhes do erro: {e.args}")
            return None