#apps/users/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from apps.core.models import Company


class UserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    name = serializers.CharField()
    companies = serializers.ListField(child=serializers.DictField())


class CustomLoginSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = serializers.DictField()


class UserSerializer(serializers.ModelSerializer):
    companies = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'is_superuser', 'companies', 'groups', 'date_joined']

    def get_companies(self, obj):
        from apps.core.serializers import CompanySerializer
        return CompanySerializer(obj.companies.all(), many=True).data

    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_active']


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class UserGroupSerializer(serializers.Serializer):
    group_ids = serializers.ListField(child=serializers.IntegerField())
    action = serializers.ChoiceField(choices=['add', 'remove', 'set'])