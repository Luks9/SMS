import re

def format_cnpj(cnpj):
    """
    Remove caracteres não numéricos do CNPJ para armazenamento no banco
    """
    if not cnpj:
        return cnpj
    
    # Remove todos os caracteres não numéricos para armazenar apenas números
    return re.sub(r'[^0-9]', '', str(cnpj))

def format_cnpj_display(cnpj):
    """
    Formata o CNPJ para exibição no padrão XX.XXX.XXX/XXXX-XX
    """
    if not cnpj:
        return cnpj
    
    # Remove todos os caracteres não numéricos
    cnpj_numbers = re.sub(r'[^0-9]', '', str(cnpj))
    
    # Se não tiver 14 dígitos, retorna como está
    if len(cnpj_numbers) != 14:
        return cnpj_numbers
    
    # Aplica a formatação XX.XXX.XXX/XXXX-XX
    return f"{cnpj_numbers[:2]}.{cnpj_numbers[2:5]}.{cnpj_numbers[5:8]}/{cnpj_numbers[8:12]}-{cnpj_numbers[12:14]}"

def validate_cnpj(cnpj):
    """
    Valida se o CNPJ é válido
    """
    if not cnpj:
        return False
    
    # Remove caracteres não numéricos
    cnpj_numbers = re.sub(r'[^0-9]', '', str(cnpj))
    
    # Verifica se tem 14 dígitos
    if len(cnpj_numbers) != 14:
        return False
    
    # Verifica se não é uma sequência de números iguais
    if cnpj_numbers == cnpj_numbers[0] * 14:
        return False
    
    return True

def clean_cnpj(cnpj):
    """
    Remove formatação do CNPJ, mantendo apenas números
    """
    if not cnpj:
        return cnpj
    return re.sub(r'[^0-9]', '', str(cnpj))
