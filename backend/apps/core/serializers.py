#apps/core/serializers.py
import os
from django.utils import timezone
from django.db.utils import DatabaseError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.users.utils.permissions import user_has_access_to_company
from .models import Company, CategoryQuestion, Question, Form, Answer, Subcategory, Evaluation, ActionPlan, Polo, StoredFile
from .utils import format_cnpj_display


class ScoreResponseSerializer(serializers.Serializer):
    evaluation_id = serializers.IntegerField()
    total_score = serializers.FloatField()
    total_weight = serializers.FloatField()
    message = serializers.CharField()


class CompanySerializer(serializers.ModelSerializer):
    cnpj_display = serializers.SerializerMethodField()
    users_list = serializers.SerializerMethodField()
    has_evaluations = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['id', 'name', 'cnpj', 'cnpj_display', 'is_active', 'users', 'users_list', 'dominio', 'has_evaluations']
    
    def get_cnpj_display(self, obj):
        """
        Retorna o CNPJ formatado para exibiÃ§Ã£o
        """
        return format_cnpj_display(obj.cnpj)
    
    def get_users_list(self, obj):
        """
        Retorna lista dos usuÃ¡rios associados Ã  empresa
        """
        return [{'id': user.id, 'username': user.username} for user in obj.users.all()]
    
    def get_has_evaluations(self, obj):
        annotated_value = getattr(obj, 'has_evaluations', None)
        if annotated_value is None:
            return obj.evaluations.filter(is_active=True).exists()
        return annotated_value
    
    def to_representation(self, instance):
        """
        Customiza a representaÃ§Ã£o para mostrar o CNPJ formatado
        """
        data = super().to_representation(instance)
        data['cnpj'] = format_cnpj_display(instance.cnpj)
        return data

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
    answered_percentage = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    fully_answered = serializers.SerializerMethodField()
    fully_evaluated = serializers.SerializerMethodField()
    has_rem_data = serializers.SerializerMethodField()

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
            'answered_percentage',
            'is_expired',
            'fully_answered',
            'fully_evaluated',
            'action_plan',
            'has_rem_data'
        ]
    
    # MÃ©todos para os campos adicionados
    @extend_schema_field(serializers.IntegerField())
    def get_total_questions(self, obj) -> int:
        # Pega todas as perguntas relacionadas ao formulÃ¡rio da avaliaÃ§Ã£o
        return obj.total_questions_count


    @extend_schema_field(serializers.IntegerField())
    def get_answered_questions(self, obj)-> int:
        # Conta as respostas que foram respondidas pelo respondente
        return obj.respondent_answers_count
    
    @extend_schema_field(serializers.IntegerField())
    def get_unanswered_questions(self, obj) -> int:
        # Calcula as perguntas nÃ£o respondidas
        total_questions = obj.total_questions_count
        answered_questions = obj.respondent_answers_count
        return total_questions - answered_questions

    @extend_schema_field(serializers.IntegerField())
    def get_answered_percentage(self, obj) -> int:
        return obj.answered_percentage()

    @extend_schema_field(serializers.BooleanField())
    def get_is_expired(self, obj) -> bool:
        return obj.is_expired()

    @extend_schema_field(serializers.BooleanField())
    def get_fully_answered(self, obj) -> bool:
        total = obj.total_questions_count
        return total > 0 and obj.respondent_answers_count >= total

    @extend_schema_field(serializers.BooleanField())
    def get_fully_evaluated(self, obj) -> bool:
        total = obj.total_questions_count
        return total > 0 and obj.evaluator_answers_count >= total
    
    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_action_plan(self, obj):
        # Retorna o ID do plano de aÃ§Ã£o associado Ã  avaliaÃ§Ã£o ou None se nÃ£o existir
        try:
            action_plan = obj.action_plans.first()  # Como sÃ³ existe um plano de aÃ§Ã£o, pegamos o primeiro
            return action_plan.id if action_plan else None
        except DatabaseError:
            # Fallback de compatibilidade enquanto migrations de ActionPlan nao foram aplicadas.
            return None
    
    @extend_schema_field(serializers.BooleanField())
    def get_has_rem_data(self, obj) -> bool:
        """
        Verifica se existe dados REM para a empresa e perÃ­odo desta avaliaÃ§Ã£o
        """
        from apps.rem.models import Rem
        return Rem.objects.filter(company=obj.company, periodo=obj.period).exists()

    def to_representation(self, instance):
        instance.refresh_status()
        return super().to_representation(instance)


    def validate(self, data):
        # Verifica se a requisiÃ§Ã£o Ã© um POST
        request = self.context.get('request')
        if request and request.method == 'POST':
            # ObtÃ©m a empresa e o perÃ­odo dos dados
            company = data.get('company')
            period = data.get('period')

            if company and period:
                # Filtra as avaliaÃ§Ãµes existentes para essa empresa e perÃ­odo
                existing_evaluations = Evaluation.objects.filter(
                    company=company,
                    period__year=period.year,
                    period__month=period.month,
                    is_active=True  # Apenas avaliaÃ§Ãµes ativas
                )

                # Verifica se jÃ¡ existe uma avaliaÃ§Ã£o ativa para essa empresa neste mÃªs/ano
                if existing_evaluations.exists():
                    raise serializers.ValidationError("JÃ¡ existe uma avaliaÃ§Ã£o ativa para essa empresa neste mÃªs/ano.")
        
        # Caso nÃ£o seja um POST, ou se a validaÃ§Ã£o nÃ£o falhou, retorna os dados
        return data

    def validate_valid_until(self, value):
        """
        Permite que apenas usuÃ¡rios staff ou superusuÃ¡rios alterem a data de vencimento
        apÃ³s a criaÃ§Ã£o da avaliaÃ§Ã£o.
        """
        if not self.instance:
            return value

        if value == self.instance.valid_until:
            return value

        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None

        if user and (user.is_staff or user.is_superuser):
            return value

        raise serializers.ValidationError("Somente administradores podem alterar a data de vencimento.")



class AnswerSerializer(serializers.ModelSerializer):
    attachment_respondent_file_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    attachment_evaluator_file_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Answer
        fields = '__all__'
        validators = []
        extra_kwargs = {
            'company': {'required': False},
        }
    
    def validate(self, data):
        # AvaliaÃ§Ã£o associada Ã  resposta
        evaluation = data.get('evaluation', self.instance.evaluation if self.instance else None)
        question = data.get('question', self.instance.question if self.instance else None)
        company = data.get('company', self.instance.company if self.instance else None)
        request = self.context.get('request')

        # Verifica se o usuÃ¡rio Ã© administrador
        if request and request.user and request.user.is_superuser:
            return data  # Permite salvar sem validar a data

        if request and request.user and evaluation:
            access_check = user_has_access_to_company(request.user, company=evaluation.company)
            if access_check is not True:
                raise serializers.ValidationError("VocÃª nÃ£o tem permissÃ£o para responder esta avaliaÃ§Ã£o.")

        if evaluation and evaluation.valid_until and evaluation.valid_until < timezone.now().date():
            raise serializers.ValidationError("A data limite para responder esta avaliaÃ§Ã£o jÃ¡ expirou.")

        if evaluation and question:
            question_in_form = evaluation.form.categories.filter(
                id=question.category_id
            ).exists()
            if not question_in_form:
                raise serializers.ValidationError(
                    "A pergunta informada nÃ£o pertence ao formulÃ¡rio desta avaliaÃ§Ã£o."
                )

        if evaluation and company and evaluation.company_id != company.id:
            raise serializers.ValidationError(
                "A empresa da resposta deve ser a mesma empresa da avaliaÃ§Ã£o."
            )

        return data


    def validate_attachment_respondent(self, value):
        if value:
            # Validar tamanho (50MB)
            if value.size > 1024 * 1024 * 50:
                raise serializers.ValidationError("O arquivo nÃ£o pode exceder 50MB.")
            
            # Validar tipo de arquivo
            allowed_extensions = ['.pdf', '.zip', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xlsx', '.xls']
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"Tipo de arquivo nÃ£o permitido. ExtensÃµes aceitas: {', '.join(allowed_extensions)}"
                )
        return value

    def validate_attachment_evaluator(self, value):
        if value:
            # Validar tamanho (50MB)
            if value.size > 1024 * 1024 * 50:
                raise serializers.ValidationError("O arquivo nÃ£o pode exceder 50MB.")
            
            # Validar tipo de arquivo
            allowed_extensions = ['.pdf', '.zip', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xlsx', '.xls']
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"Tipo de arquivo nÃ£o permitido. ExtensÃµes aceitas: {', '.join(allowed_extensions)}"
                )
        return value

    def create(self, validated_data):
        respondent_file_id = validated_data.pop('attachment_respondent_file_id', None)
        evaluator_file_id = validated_data.pop('attachment_evaluator_file_id', None)
        evaluation = validated_data.get('evaluation')
        if evaluation:
            validated_data['company'] = evaluation.company

        # Evita erro de unicidade em retries/clique duplo (evaluation + question).
        instance, _created = Answer.objects.update_or_create(
            evaluation=validated_data['evaluation'],
            question=validated_data['question'],
            defaults=validated_data,
        )

        if respondent_file_id:
            file_obj = StoredFile.objects.filter(id=respondent_file_id, is_active=True).first()
            if file_obj:
                instance.attachment_respondent_file = file_obj
                if instance.company_id and not file_obj.company_id:
                    file_obj.company = instance.company
                    file_obj.save(update_fields=['company', 'updated_at'])
        if evaluator_file_id:
            file_obj = StoredFile.objects.filter(id=evaluator_file_id, is_active=True).first()
            if file_obj:
                instance.attachment_evaluator_file = file_obj
                if instance.company_id and not file_obj.company_id:
                    file_obj.company = instance.company
                    file_obj.save(update_fields=['company', 'updated_at'])
        if respondent_file_id or evaluator_file_id:
            instance.save(update_fields=['attachment_respondent_file', 'attachment_evaluator_file'])
        return instance

    def update(self, instance, validated_data):
        respondent_file_id = validated_data.pop('attachment_respondent_file_id', None)
        evaluator_file_id = validated_data.pop('attachment_evaluator_file_id', None)
        instance = super().update(instance, validated_data)

        if respondent_file_id is not None:
            if respondent_file_id:
                file_obj = StoredFile.objects.filter(id=respondent_file_id, is_active=True).first()
                instance.attachment_respondent_file = file_obj
                if file_obj and instance.company_id and not file_obj.company_id:
                    file_obj.company = instance.company
                    file_obj.save(update_fields=['company', 'updated_at'])
            else:
                instance.attachment_respondent_file = None

        if evaluator_file_id is not None:
            if evaluator_file_id:
                file_obj = StoredFile.objects.filter(id=evaluator_file_id, is_active=True).first()
                instance.attachment_evaluator_file = file_obj
                if file_obj and instance.company_id and not file_obj.company_id:
                    file_obj.company = instance.company
                    file_obj.save(update_fields=['company', 'updated_at'])
            else:
                instance.attachment_evaluator_file = None

        if respondent_file_id is not None or evaluator_file_id is not None:
            instance.save(update_fields=['attachment_respondent_file', 'attachment_evaluator_file'])
        return instance


#-----------------------Detalhes da avaliaÃ§Ã£o------------------------------

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
                'attachment_respondent_file_id': None,
                'attachment_respondent_name': None,
                'date_respondent': None,
                'answer_evaluator': None,
                'attachment_evaluator': None,
                'attachment_evaluator_file_id': None,
                'attachment_evaluator_name': None,
                'date_evaluator': None,
                'note': None,
            }



class AnswerDetailSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question', read_only=True)
    attachment_respondent_file_id = serializers.SerializerMethodField()
    attachment_respondent_name = serializers.SerializerMethodField()
    attachment_evaluator_file_id = serializers.SerializerMethodField()
    attachment_evaluator_name = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = [
            'id',
            'question_text',
            'answer_respondent',
            'attachment_respondent',
            'attachment_respondent_file_id',
            'attachment_respondent_name',
            'date_respondent',
            'answer_evaluator',
            'attachment_evaluator',
            'attachment_evaluator_file_id',
            'attachment_evaluator_name',
            'date_evaluator',
            'note'
        ]

    def get_attachment_respondent_file_id(self, obj):
        return str(obj.attachment_respondent_file_id) if obj.attachment_respondent_file_id else None

    def get_attachment_respondent_name(self, obj):
        return obj.attachment_respondent_file.original_file_name if obj.attachment_respondent_file else None

    def get_attachment_evaluator_file_id(self, obj):
        return str(obj.attachment_evaluator_file_id) if obj.attachment_evaluator_file_id else None

    def get_attachment_evaluator_name(self, obj):
        return obj.attachment_evaluator_file.original_file_name if obj.attachment_evaluator_file else None


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
        # Pega todas as perguntas relacionadas ao formulÃ¡rio da avaliaÃ§Ã£o
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
    responsible_name = serializers.SerializerMethodField()
    response_choice_display = serializers.CharField(source='get_response_choice_display', read_only=True)
    created_at = serializers.DateField(source='start_date', read_only=True)
    attachment_file_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    attachment_remote_file_id = serializers.SerializerMethodField()
    attachment_remote_name = serializers.SerializerMethodField()

    class Meta:
        model = ActionPlan
        fields = [
            'id',
            'company',
            'company_name',
            'evaluation',
            'description',
            'response_company',
            'response_choice',
            'response_choice_display',
            'response_date',
            'start_date',
            'created_at',
            'end_date',
            'responsible',
            'responsible_name',
            'status',
            'attachment',
            'attachment_file_id',
            'attachment_remote_file_id',
            'attachment_remote_name',
        ]

    def validate(self, data):
        # Verificar se o plano de aÃ§Ã£o jÃ¡ expirou
        end_date = data.get('end_date', self.instance.end_date if self.instance else None)
        
        if end_date and end_date < timezone.now().date():
            # Se expirou, verifica se o status ainda nÃ£o estÃ¡ como 'COMPLETED'
            if self.instance and self.instance.status != 'COMPLETED':
                # Atualiza o status para 'COMPLETED'
                self.instance.status = 'COMPLETED'
                self.instance.save()  # Salva imediatamente a mudanÃ§a
            
            raise serializers.ValidationError("O prazo deste plano de aÃ§Ã£o jÃ¡ expirou.")
        
        return data

    def get_responsible_name(self, obj):
        if obj.responsible:
            return obj.responsible.get_full_name() or obj.responsible.username
        return None
    
    def update(self, instance, validated_data):
        """
        Atualiza o status do plano de aÃ§Ã£o para 'IN_PROGRESS' se houver resposta e o end_date nÃ£o expirou
        """
        attachment_file_id = validated_data.pop('attachment_file_id', None)
        response_fields = {'response_company', 'response_choice', 'attachment'}
        has_response_update = any(field in validated_data for field in response_fields)

        instance = super().update(instance, validated_data)

        if attachment_file_id is not None:
            if attachment_file_id:
                file_obj = StoredFile.objects.filter(id=attachment_file_id, is_active=True).first()
                instance.attachment_file = file_obj
                if file_obj and instance.company_id and not file_obj.company_id:
                    file_obj.company = instance.company
                    file_obj.save(update_fields=['company', 'updated_at'])
            else:
                instance.attachment_file = None
            instance.save(update_fields=['attachment_file'])

        response_text = instance.response_company.strip() if instance.response_company else ''
        response_provided = bool(response_text or instance.response_choice or instance.attachment)

        if has_response_update and response_provided:
            instance.response_date = timezone.now().date()
            if instance.status == 'PENDING':
                instance.status = 'IN_PROGRESS'
            instance.save(update_fields=['response_date', 'status'])

        return instance

    def get_attachment_remote_file_id(self, obj):
        return str(obj.attachment_file_id) if obj.attachment_file_id else None

    def get_attachment_remote_name(self, obj):
        return obj.attachment_file.original_file_name if obj.attachment_file else None
    

class PoloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Polo
        fields = [
            "id",
            "name",
            "description",
            "companies",
            "users",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")




