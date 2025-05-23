#apps/core/serializers.py
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation, ActionPlan


class ScoreResponseSerializer(serializers.Serializer):
    evaluation_id = serializers.IntegerField()
    total_score = serializers.FloatField()
    total_weight = serializers.FloatField()
    message = serializers.CharField()


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
        fields = ['id', 'category', 'category_name', 'recommendation','subcategory_name','subcategory', 'question', 'is_active']


class FormSerializer(serializers.ModelSerializer):
    category_names = serializers.SerializerMethodField()

    class Meta:
        model = Form
        fields = ['id', 'name', 'is_active', 'categories', 'category_names']

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_category_names(self, obj):
        return [category.name for category in obj.categories.all()]
    

class EvaluationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    form_name = serializers.CharField(source="form.name", read_only=True)
    action_plan = serializers.SerializerMethodField()
    
    # Novos campos calculados
    total_questions = serializers.SerializerMethodField()
    answered_questions = serializers.SerializerMethodField()
    unanswered_questions = serializers.SerializerMethodField()

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
            'total_questions',  # Incluindo o total de perguntas
            'answered_questions',  # Incluindo o total de perguntas respondidas
            'unanswered_questions',
            'action_plan'
        ]
    
    # Métodos para os campos adicionados
    @extend_schema_field(serializers.IntegerField())
    def get_total_questions(self, obj) -> int:
        # Pega todas as perguntas relacionadas ao formulário da avaliação
        return Question.objects.filter(category__in=obj.form.categories.all()).count()


    @extend_schema_field(serializers.IntegerField())
    def get_answered_questions(self, obj)-> int:
        # Conta as respostas que foram respondidas pelo respondente
        return Answer.objects.filter(evaluation=obj).exclude(answer_respondent__in=[None, '']).count()
    
    @extend_schema_field(serializers.IntegerField())
    def get_unanswered_questions(self, obj) -> int:
        # Calcula as perguntas não respondidas
        total_questions = self.get_total_questions(obj)
        answered_questions = self.get_answered_questions(obj)
        return total_questions - answered_questions
    
    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_action_plan(self, obj):
        # Retorna o ID do plano de ação associado à avaliação ou None se não existir
        action_plan = obj.action_plans.first()  # Como só existe um plano de ação, pegamos o primeiro
        return action_plan.id if action_plan else None


    def validate(self, data):
        # Verifica se a requisição é um POST
        request = self.context.get('request')
        if request and request.method == 'POST':
            # Obtém a empresa e o período dos dados
            company = data.get('company')
            period = data.get('period')

            if company and period:
                # Filtra as avaliações existentes para essa empresa e período
                existing_evaluations = Evaluation.objects.filter(
                    company=company,
                    period__year=period.year,
                    period__month=period.month,
                    is_active=True  # Apenas avaliações ativas
                )

                # Verifica se já existe uma avaliação ativa para essa empresa neste mês/ano
                if existing_evaluations.exists():
                    raise serializers.ValidationError("Já existe uma avaliação ativa para essa empresa neste mês/ano.")
        
        # Caso não seja um POST, ou se a validação não falhou, retorna os dados
        return data



class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = '__all__'
    
    def validate(self, data):
        # Avaliação associada à resposta
        evaluation = data.get('evaluation', self.instance.evaluation if self.instance else None)
        request = self.context.get('request')

        # Verifica se o usuário é administrador
        if request and request.user and request.user.is_superuser:
            return data  # Permite salvar sem validar a data

        if evaluation and evaluation.valid_until and evaluation.valid_until < timezone.now().date():
            raise serializers.ValidationError("A data limite para responder esta avaliação já expirou.")

        return data


    def validate_attachment_respondent(self, value):
        if value and value.size > 1024 * 1024 * 5:  # Limite de 5 MB
            raise serializers.ValidationError("O arquivo não pode exceder 5MB.")
        return value

    def validate_attachment_evaluator(self, value):
        if value and value.size > 1024 * 1024 * 5:  # Limite de 5 MB
            raise serializers.ValidationError("O arquivo não pode exceder 5MB.")
        return value


#-----------------------Detalhes da avaliação------------------------------

class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    answer = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question', 'recommendation', 'category_name', 'subcategory_name', 'answer']

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
            'attachment_respondent',  # Mantenha se quiser a referência ao arquivo
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

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_questions(self, obj):
        questions = Question.objects.filter(category__in=obj.form.categories.all())
        return QuestionWithAnswerSerializer(questions, many=True, context={'evaluation': obj, 'request': self.context.get('request')}).data


class EvaluationProgressSerializer(serializers.ModelSerializer):
    total_questions = serializers.SerializerMethodField()
    answered_questions = serializers.SerializerMethodField()
    unanswered_questions = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = ['id', 'total_questions', 'answered_questions', 'unanswered_questions']

    def get_total_questions(self, obj):
        # Pega todas as perguntas relacionadas ao formulário da avaliação
        return Question.objects.filter(category__in=obj.form.categories.all()).count()

    def get_answered_questions(self, obj):
        # Conta as respostas que foram respondidas pelo respondente
        return Answer.objects.filter(evaluation=obj).exclude(answer_respondent__isnull=True).exclude(answer_respondent='').count()

    def get_unanswered_questions(self, obj):
        # Total de perguntas menos o total de perguntas respondidas
        total_questions = self.get_total_questions(obj)
        answered_questions = self.get_answered_questions(obj)
        return total_questions - answered_questions


class ActionPlanSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = ActionPlan
        fields = ['id', 'company', 'evaluation', 'description', 'response_company', 'start_date', 'end_date', 'responsible', 'status', 'attachment', 'company_name']

    def validate(self, data):
        # Verificar se o plano de ação já expirou
        end_date = data.get('end_date', self.instance.end_date if self.instance else None)
        
        if end_date and end_date < timezone.now().date():
            # Se expirou, verifica se o status ainda não está como 'COMPLETED'
            if self.instance and self.instance.status != 'COMPLETED':
                # Atualiza o status para 'COMPLETED'
                self.instance.status = 'COMPLETED'
                self.instance.save()  # Salva imediatamente a mudança
            
            raise serializers.ValidationError("O prazo deste plano de ação já expirou.")
        
        return data
    
    def update(self, instance, validated_data):
        """
        Atualiza o status do plano de ação para 'IN_PROGRESS' se houver resposta e o end_date não expirou
        """
        # Atualiza os campos normalmente
        instance = super().update(instance, validated_data)
        
        # Verifica se há uma resposta da empresa
        if instance.response_company and instance.end_date >= timezone.now().date():
            instance.status = "IN_PROGRESS"
        
        instance.save()
        return instance