from rest_framework import serializers

class UserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    # Adicione outros campos conforme necessário

class CustomLoginSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserProfileSerializer()
    # Adicione outros campos conforme necessário
