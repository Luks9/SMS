from rest_framework import serializers
from .models import Rem, DieselConsumido, FuncionariosDemitidos
from apps.users.utils.permissions import user_has_access_to_company

class RemSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    def validate_company(self, value):
        request = self.context.get('request')
        if request and request.user:
            access = user_has_access_to_company(request.user, value)
            if access is not True:
                raise serializers.ValidationError("Você não tem permissão para associar este REM a esta empresa.")
        return value

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

class DieselConsumidoSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    def validate_company(self, value):
        request = self.context.get('request')
        if request and request.user:
            access = user_has_access_to_company(request.user, value)
            if access is not True:
                raise serializers.ValidationError("Você não tem permissão para associar este registro a esta empresa.")
        return value

    class Meta:
        model = DieselConsumido
        fields = ['id', 'periodo', 'diesel_consumido', 'company', 'company_name']

class FuncionariosDemitidosSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    def validate_company(self, value):
        request = self.context.get('request')
        if request and request.user:
            access = user_has_access_to_company(request.user, value)
            if access is not True:
                raise serializers.ValidationError("Você não tem permissão para associar este registro a esta empresa.")
        return value

    class Meta:
        model = FuncionariosDemitidos
        fields = ['id', 'periodo', 'funcionarios_demitidos', 'company', 'company_name']