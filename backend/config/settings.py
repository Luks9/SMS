from pathlib import Path
from datetime import timedelta
from decouple import config, Csv
import os 
import urllib3

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

MEDIA_URL = '/media/'

STATIC_URL = 'static/'

# Diretório onde os arquivos estáticos serão armazenados para produção
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5 or SECRET_KEY.startswith('django-insecure-'):
    raise ValueError("SECRET_KEY must be at least 50 characters long, contain at least 5 unique characters, and not start with 'django-insecure-'.")

ENVIRONMENT = config('ENVIRONMENT', default='development')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

if DEBUG and ENVIRONMENT == 'production':
    print("WARNING: DEBUG should not be set to True in production!")

if config('ENVIRONMENT', default='development') == 'development':
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.authentication.LenientJWTAuthentication',
        'django_auth_adfs.rest_framework.AdfsAccessTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'API SMS',
    'DESCRIPTION': 'Descrição da sua API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'Empresas', 'description': 'Operações relacionadas a empresas'},
        {'name': 'Categorias', 'description': 'Operações relacionadas a categorias de perguntas'},
        {'name': 'Perguntas', 'description': 'Operações relacionadas a perguntas'},
        {'name': 'Formulários', 'description': 'Operações relacionadas a formulários'},
        {'name': 'Respostas', 'description': 'Operações relacionadas a respostas'},
    ],
    'ENUM_NAME_OVERRIDES': {
        'apps.core.enums.AnswerEvaluatorEnum': 'CustomAnswerEvaluatorEnum',  # Ensure correct module path
        'apps.core.enums.StatusEnum': 'CustomStatusEnum',  # Ensure correct module path
    },
}

# Security settings
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)  # Set to a positive value in production
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=False, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)

SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'drf_spectacular',
    'apps.core',
    'apps.rem',
    'apps.users',
    'django_auth_adfs',
]

if ENVIRONMENT == 'development':
    INSTALLED_APPS.append('sslserver')


AUTHENTICATION_BACKENDS = (
    'apps.users.backends.CustomAdfsBackend',
    'django.contrib.auth.backends.ModelBackend',
)

AUTH_ADFS = {
    "TENANT_ID": config("ADFS_TENANT_ID"),
    "CLIENT_ID": config("ADFS_CLIENT_ID"),
    "AUDIENCE": config("ADFS_AUDIENCE"),
    "RELYING_PARTY_ID": config("ADFS_RELYING_PARTY_ID"),
    "CA_BUNDLE": config("ADFS_CA_BUNDLE", default=False, cast=bool),
    "CLAIM_MAPPING": {
        "first_name": "given_name",
        "last_name": "family_name",
        "email": "email"
    },
    "GROUPS_CLAIM": None,
    "USERNAME_CLAIM": config("ADFS_USERNAME_CLAIM", default="upn"),
    "LOGIN_EXEMPT_URLS": [
        '^api',
    ],
    "DISABLE_SSO": False,
    "BOOLEAN_CLAIM_MAPPING": {},
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DB_ENGINE = config('DB_ENGINE', default='django.db.backends.sqlite3')
DB_DRIVER = config('DB_OPTIONS', default='')
db_options = {}
if 'sqlite3' not in DB_ENGINE and DB_DRIVER:
    db_options['DRIVER'] = DB_DRIVER

DATABASES = {
    'default': {
        'ENGINE': DB_ENGINE,
        'NAME': config('DB_NAME', default=BASE_DIR / 'db.sqlite3'),
        'USER': config('DB_USER', default=''),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'OPTIONS': db_options,
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True


# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=50),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django_auth_adfs': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# OneDrive / Graph upload settings
ONEDRIVE_GRAPH_BASE_URL = config('ONEDRIVE_GRAPH_BASE_URL', default='https://graph.microsoft.com/v1.0')
ONEDRIVE_TENANT_ID = config('ONEDRIVE_TENANT_ID', default='')
ONEDRIVE_CLIENT_ID = config('ONEDRIVE_CLIENT_ID', default='')
ONEDRIVE_CLIENT_SECRET = config('ONEDRIVE_CLIENT_SECRET', default='')
ONEDRIVE_DRIVE_ID = config('ONEDRIVE_DRIVE_ID', default='')
ONEDRIVE_BASE_PATH = config('ONEDRIVE_BASE_PATH', default='SMS')
ONEDRIVE_TIMEOUT_SECONDS = config('ONEDRIVE_TIMEOUT_SECONDS', default=60, cast=int)
ONEDRIVE_MAX_RETRIES = config('ONEDRIVE_MAX_RETRIES', default=3, cast=int)

UPLOAD_CHUNK_SIZE = config('UPLOAD_CHUNK_SIZE', default=5242880, cast=int)
UPLOAD_MAX_FILE_SIZE_MB = config('UPLOAD_MAX_FILE_SIZE_MB', default=200, cast=int)
LEGACY_MULTIPART_THRESHOLD_MB = config('LEGACY_MULTIPART_THRESHOLD_MB', default=15, cast=int)
UPLOAD_ALLOWED_EXTENSIONS = config(
    'UPLOAD_ALLOWED_EXTENSIONS',
    default='.pdf,.zip,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls,.txt,.csv',
    cast=Csv(),
)

STORAGE_PROVIDER = config('STORAGE_PROVIDER', default='onedrive')
LOCAL_UPLOAD_TMP_DIR = config('LOCAL_UPLOAD_TMP_DIR', default=os.path.join(MEDIA_ROOT, '.upload_tmp'))
LOCAL_UPLOAD_BASE_PATH = config('LOCAL_UPLOAD_BASE_PATH', default='attachments/resumable')
LOCAL_UPLOAD_PART_TTL_HOURS = config('LOCAL_UPLOAD_PART_TTL_HOURS', default=24, cast=int)
LOCAL_UPLOAD_CLEANUP_INTERVAL_SECONDS = config('LOCAL_UPLOAD_CLEANUP_INTERVAL_SECONDS', default=1800, cast=int)
