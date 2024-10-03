from rest_framework import serializers
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
    
