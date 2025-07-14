#apps/users/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from apps.core.serializers import CompanySerializer

class UserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    name = serializers.CharField()
    company = CompanySerializer(required=False, allow_null=True)
    

class CustomLoginSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserProfileSerializer()

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'name', 'company', 'groups', 'is_active', 'is_staff', 'is_superuser', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip()
    
    def get_company(self, obj):
        company = obj.companies.first()
        return CompanySerializer(company).data if company else None
    
    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_active']
        
    def validate_username(self, value):
        if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return value
        
    def validate_email(self, value):
        if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class UserGroupSerializer(serializers.Serializer):
    group_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)
    action = serializers.ChoiceField(choices=['add', 'remove', 'set'])
    
    def validate_group_ids(self, value):
        # Permitir lista vazia para a ação 'set' (remover todos os grupos)
        if not value and self.initial_data.get('action') != 'set':
            raise serializers.ValidationError("Pelo menos um grupo deve ser fornecido.")
        
        # Verificar se todos os grupos existem (apenas se a lista não estiver vazia)
        if value:
            existing_groups = Group.objects.filter(id__in=value).count()
            if existing_groups != len(value):
                raise serializers.ValidationError("Alguns grupos não existem.")
        
        return value