from decouple import config
from csp.constants import NONCE

def get_csp_config():
    """
    Retorna a configuração CSP baseada no ambiente
    """
    environment = config('ENVIRONMENT', default='development')
    
    if environment == 'development':
        # Configurações mais permissivas para desenvolvimento
        return {
            'DIRECTIVES': {
                'default-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                'script-src': [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "https://login.microsoftonline.com",
                    "https://alcdn.msauth.net",
                    "localhost:3000",
                    "127.0.0.1:3000",
                    NONCE
                ],
                'style-src': [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://cdnjs.cloudflare.com",
                    "localhost:3000",
                    NONCE
                ],
                'img-src': [
                    "'self'",
                    "data:",
                    "blob:",
                    "https:",
                    "localhost:3000"
                ],
                'font-src': [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "https://cdnjs.cloudflare.com",
                    "localhost:3000"
                ],
                'connect-src': [
                    "'self'",
                    "https://login.microsoftonline.com",
                    "https://graph.microsoft.com",
                    "localhost:3000",
                    "127.0.0.1:8000",
                    "wss://localhost:3000",
                ],
                'frame-src': [
                    "'self'",
                    "https://login.microsoftonline.com"
                ],
                'object-src': ["'none'"],
                'base-uri': ["'self'"],
                'form-action': ["'self'", "https://login.microsoftonline.com"],
                'frame-ancestors': ["'self'"]
            }
        }
    
    else:
        # *** CONFIGURAÇÕES DE PRODUÇÃO - Brava Energia ***
        
        # URLs de produção
        frontend_url = config('FRONTEND_URL', default='https://sms-avalia.bravaenergia.com')
        backend_url = config('BACKEND_URL', default='https://backend-sms-avalia.bravaenergia.com')
        internal_server = config('INTERNAL_SERVER', default='https://001pism01.3rpetroleum.lan')
        
        csp_config = {
            'DIRECTIVES': {
                'default-src': ["'self'"],
                'script-src': [
                    "'self'",
                    "https://login.microsoftonline.com",
                    "https://alcdn.msauth.net",
                    frontend_url,
                    internal_server,
                    NONCE
                ],
                'style-src': [
                    "'self'",
                    "https://fonts.googleapis.com",
                    "https://cdnjs.cloudflare.com",
                    frontend_url,
                    internal_server,
                    NONCE
                ],
                'img-src': [
                    "'self'",
                    "data:",
                    "https:",
                    frontend_url,
                    backend_url,
                    internal_server
                ],
                'font-src': [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "https://cdnjs.cloudflare.com",
                    frontend_url,
                    internal_server
                ],
                'connect-src': [
                    "'self'",
                    "https://login.microsoftonline.com",
                    "https://graph.microsoft.com",
                    frontend_url,           # Frontend -> Backend
                    backend_url,            # Backend interno
                    internal_server,        # Servidor interno
                    "*.bravaenergia.com",   # Subdominios da empresa
                ],
                'frame-src': [
                    "'self'",
                    "https://login.microsoftonline.com"
                ],
                'object-src': ["'none'"],
                'base-uri': ["'self'"],
                'form-action': [
                    "'self'", 
                    "https://login.microsoftonline.com",
                    frontend_url
                ],
                'frame-ancestors': ["'self'"]
            }
        }
        
        # Adicionar relatórios de violação em produção
        csp_config['DIRECTIVES']['report-uri'] = ['/csp-report/']
        
        return csp_config