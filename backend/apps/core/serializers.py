from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation

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
    category_names = serializers.SerializerMethodField()

    class Meta:
        model = Form
        fields = ['id', 'name', 'is_active', 'categories', 'category_names']

    def get_category_names(self, obj):
        return [category.name for category in obj.categories.all()]
    

class EvaluationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    #evaluator_name = serializers.CharField(source="User.first_name", read_only=True)
    form_name = serializers.CharField(source="form.name", read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            'id', 
            'company', 
            'company_name', 
            'completed_at', 
            'created_at', 
            'evaluator', 
            'form', 
            'form_name', 
            'is_active', 
            'score', 
            'status', 
        ]


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = '__all__'
