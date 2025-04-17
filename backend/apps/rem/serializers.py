from rest_framework import serializers
from .models import Rem

class RemSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Rem
        fields = [
            'id', 'periodo', 'empregados', 'horas_homem_exposicao', 'acidentes_com_afastamento',
            'acidentes_sem_afastamento', 'acidentes_com_afastamento_tipicos', 'acidentes_transito',
            'taxa_com_afastamento', 'taxa_sem_afastamento', 'acidentados_registraveis', 'company',
            'company_name', 'gravidade', 'dias_perdidos_debitados', 'fatalidades', 'incidencia',
            'lma_nca', 'lma_tfca', 'outros', 'primeiros_socorros', 'total_incidentes_registraveis',
            'trabalho_restrito', 'tratamento_medico'
        ]