#apps/users/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from apps.core.serializers import PoloSerializer


class UserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    name = serializers.CharField()
    companies = serializers.ListField(child=serializers.DictField())


class CustomLoginSerializer(serializers.Serializer):
    token = serializers.CharField()
    refresh = serializers.CharField(required=False)
    user = serializers.DictField()


class UserSerializer(serializers.ModelSerializer):
    companies = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    polos = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'is_superuser', 'companies', 'groups', 'date_joined', 'is_staff', 'polos']

    def get_companies(self, obj):
        from apps.core.serializers import CompanySerializer
        companies = obj.companies.all().prefetch_related('poles')
        serialized = CompanySerializer(companies, many=True).data

        company_map = {company.id: company for company in companies}
        for item in serialized:
            company = company_map.get(item.get('id'))
            if not company:
                item['poles'] = []
                continue
            item['poles'] = [
                {
                    'id': pole.id,
                    'name': pole.name,
                    'description': pole.description,
                }
                for pole in company.poles.all().order_by('name')
            ]
        return serialized

    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def get_polos(self, obj):
        return PoloSerializer(obj.poles.all(), many=True).data


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_active', 'is_superuser']


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class UserGroupSerializer(serializers.Serializer):
    group_ids = serializers.ListField(child=serializers.IntegerField())
    action = serializers.ChoiceField(choices=['add', 'remove', 'set'])
