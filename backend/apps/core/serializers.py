from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class CategoryQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryQuestion
        fields = '__all__'

class SubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcategory
        fields = '__all__'


class QuestionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name'  , read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'category', 'category_name', 'subcategory_name','subcategory', 'question', 'is_active']


class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = '__all__'

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = '__all__'
