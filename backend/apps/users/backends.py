from django_auth_adfs.backend import AdfsAccessTokenBackend
from django.contrib.auth.models import User
from apps.users.utils.domain_utils import clean_username, associate_user_with_company_by_domain
from django_auth_adfs.config import Settings
import logging

logger = logging.getLogger(__name__)


class CustomAdfsBackend(AdfsAccessTokenBackend):
    """
    Backend customizado que limpa o username e associa empresa na criacao
    """

    def __init__(self):
        super().__init__()
        self.settings = Settings()
        self._user_cache = {}  # Cache simples para evitar consultas desnecessarias

    def create_user(self, claims):
        """
        Sobrescreve a criacao do usuario para limpar o username e associar empresa
        """
        username = claims.get(self.settings.USERNAME_CLAIM, '')
        fallback_email = (
            claims.get("email")
            or claims.get("upn")
            or claims.get("preferred_username")
            or ""
        )

        # Limpa o username antes de criar o usuario
        cleaned_username = clean_username(username, fallback_email=fallback_email)
        if not cleaned_username:
            logger.error(
                "Username invalido apos limpeza. username_claim=%s fallback_email=%s",
                username,
                fallback_email,
            )
            return None

        # Verifica cache primeiro
        cache_key = f"user_{cleaned_username}"
        if cache_key in self._user_cache:
            user = self._user_cache[cache_key]
            logger.info(f"Usuario {cleaned_username} encontrado no cache")
            return user

        # Verifica se usuario ja existe com username limpo
        try:
            existing_user = User.objects.get(username=cleaned_username)
            logger.info(f"Usuario {cleaned_username} encontrado no banco")

            # Para usuarios existentes, verifica se precisa reprocessar apenas uma vez
            if not existing_user.is_superuser:
                has_company = existing_user.companies.exists()
                has_group = existing_user.groups.exists()

                if not (has_company and has_group):
                    logger.info(f"Configurando empresa/grupos para {cleaned_username}")
                    processed_user = associate_user_with_company_by_domain(existing_user)
                    if processed_user:
                        existing_user = processed_user

            # Adiciona ao cache
            self._user_cache[cache_key] = existing_user
            return existing_user

        except User.DoesNotExist:
            pass  # Continua para criar novo usuario

        # Substitui o claim do username pelo username limpo
        claims[self.settings.USERNAME_CLAIM] = cleaned_username

        # Chama o metodo pai para criar o usuario com username limpo
        user = super().create_user(claims)

        if user:
            logger.info(f"Novo usuario criado: {cleaned_username}")
            # Associa empresa e grupos na criacao
            processed_user = associate_user_with_company_by_domain(user)
            final_user = processed_user if processed_user else user

            # Adiciona ao cache
            self._user_cache[cache_key] = final_user
            return final_user

        return None

    def authenticate(self, request, access_token=None, **kwargs):
        """
        Metodo principal de autenticacao simplificado
        """
        try:
            # django-auth-adfs expects bytes and calls .decode() internally.
            # Accept both str and bytes at this boundary.
            if isinstance(access_token, str):
                access_token = access_token.encode("utf-8")

            user = super().authenticate(request, access_token=access_token, **kwargs)
            if user:
                logger.info(f"Autenticacao bem-sucedida: {user.username}")
            return user
        except Exception as e:
            logger.exception(f"Erro na autenticacao ADFS: {str(e)}")
            return None
