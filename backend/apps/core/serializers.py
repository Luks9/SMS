from rest_framework import serializers
from django.utils import timezone
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
    form_name = serializers.CharField(source="form.name", read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            'id', 
            'company', 
            'company_name', 
            'completed_at', 
            'created_at', 
            'valid_until',
            'evaluator', 
            'form', 
            'form_name', 
            'is_active', 
            'score', 
            'status',
            'period', 
        ]
    
    def validate(self, data):
        # Obtém a empresa, formulário e competência dos dados
        company = data.get('company')
        #form = data.get('form')
        period = data.get('period')

        # Filtra as avaliações existentes para essa empresa, formulário e competência
        existing_evaluations = Evaluation.objects.filter(
            company=company,
            #form=form,
            period__year=period.year,
            period__month=period.month,
            is_active=True  # Apenas avaliações ativas
        )

        # Verifica se já existe uma avaliação ativa para essa empresa, formulário e competência
        if existing_evaluations.exists():
            raise serializers.ValidationError("Já existe uma avaliação ativa para essa empresa neste mês/ano.")

        return data


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = '__all__'


#-----------------------Detalhes da avaliação------------------------------

class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    answer = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question', 'category_name', 'subcategory_name', 'answer']

    def get_answer(self, obj):
        evaluation = self.context.get('evaluation')
        try:
            answer = Answer.objects.get(question=obj, evaluation=evaluation)
            return AnswerDetailSerializer(answer).data
        except Answer.DoesNotExist:
            return {
                'answer_respondent': None,
                'attachment_respondent': None,
                'date_respondent': None,
                'answer_evaluator': None,
                'attachment_evaluator': None,
                'date_evaluator': None,
                'note': None,
            }



class AnswerDetailSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question', read_only=True)
    
    class Meta:
        model = Answer
        fields = [
            'id',
            'question_text',
            'answer_respondent',
            'attachment_respondent',
            'date_respondent',
            'answer_evaluator',
            'attachment_evaluator',
            'date_evaluator',
            'note'
        ]

class EvaluationDetailSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    form_name = serializers.CharField(source='form.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.username', read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            'id',
            'company_name',
            'evaluator_name',
            'form_name',
            'created_at',
            'completed_at',
            'valid_until',
            'score',
            'status',
            'questions',
            'period'
        ]

    def get_questions(self, obj):
        questions = Question.objects.filter(category__in=obj.form.categories.all())
        return QuestionWithAnswerSerializer(questions, many=True, context={'evaluation': obj}).data
