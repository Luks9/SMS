#apps/core/models.py

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
import os, re
import uuid
from .utils import format_cnpj

ANSWER_CHOICES = [
    ('NA', 'Não Aplicável'),
    ('C', 'Conforme'),
    ('NC', 'Não Conforme'),
    ('A', 'Em Análise'),
]

def sanitize_filename(value: str) -> str:
    """Remove caracteres inválidos para nome de arquivo"""
    value = value.strip().replace(" ", "_")
    return re.sub(r"[^A-Za-z0-9._-]", "", value)

def rename_attachment_respondent(instance, filename):
    ext = filename.split('.')[-1]

    # Período da avaliação no formato YYYYMM
    period_str = instance.evaluation.period.strftime("%Y%m") if instance.evaluation.period else "no-period"

    # Nome da empresa (limpo)
    company_name = sanitize_filename(instance.company.name)

    # ID da pergunta
    question_id = instance.question.id if instance.question_id else "no-question"

    new_filename = f"{period_str}_{company_name}_Q{question_id}.{ext}"

    return os.path.join("attachments", "respondent", timezone.now().strftime("%Y/%m"), new_filename)


def rename_attachment_evaluator(instance, filename):
    ext = filename.split('.')[-1]

    # Período da avaliação no formato YYYYMM
    period_str = instance.evaluation.period.strftime("%Y%m") if instance.evaluation.period else "no-period"

    # Nome da empresa (limpo)
    company_name = sanitize_filename(instance.company.name)

    # ID da pergunta
    question_id = instance.question.id if instance.question_id else "no-question"

    new_filename = f"{period_str}_{company_name}_Q{question_id}.{ext}"

    return os.path.join("attachments", "evaluator", timezone.now().strftime("%Y/%m"), new_filename)


class Company(models.Model):
    name = models.CharField(max_length=255)
    cnpj = models.CharField(max_length=18, unique=False)
    is_active = models.BooleanField(default=True)
    users = models.ManyToManyField(User, related_name='companies', blank=True)  # Changed from ForeignKey to ManyToMany
    dominio = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def save(self, *args, **kwargs):
        # Limpar o CNPJ antes de salvar (manter apenas números)
        if self.cnpj:
            self.cnpj = format_cnpj(self.cnpj)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    @classmethod
    def find_by_domain(cls, domain):
        """
        Busca uma empresa ativa pelo domínio
        """
        return cls.objects.filter(dominio=domain, is_active=True).first()

class CategoryQuestion(models.Model):
    name = models.CharField(max_length=255)
    weight = models.FloatField()
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Categoria de Pergunta"
        verbose_name_plural = "Categorias de Perguntas"

    def __str__(self):
        return self.name
    
class Subcategory(models.Model):
    name = models.CharField(max_length=255)
    category = models.ForeignKey(CategoryQuestion, on_delete=models.PROTECT, related_name='subcategories')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Subcategoria"
        verbose_name_plural = "Subcategorias"

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class Question(models.Model):
    category = models.ForeignKey(CategoryQuestion, on_delete=models.PROTECT)
    subcategory = models.ForeignKey(Subcategory, on_delete=models.PROTECT, blank=True, null=True, related_name='questions')
    question = models.TextField()
    recommendation = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.question

class Form(models.Model):
    name = models.CharField(max_length=255)
    categories = models.ManyToManyField(CategoryQuestion, related_name='forms')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name
    
class Evaluation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendente'),
        ('IN_PROGRESS', 'Em Progresso'),
        ('EXPIRED', 'Expirada'),
        ('COMPLETED', 'Concluída'),
        ('CANCELLED', 'Cancelada'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='evaluations')
    evaluator = models.ForeignKey(User, on_delete=models.PROTECT, related_name='evaluations')
    form = models.ForeignKey(Form, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateField()  # Data da validade da para responder avaliação
    score = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    period = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Evaluation {self.id} - {self.company.name}"

    def _cache_value(self, attr_name, value):
        setattr(self, attr_name, value)
        return value

    @property
    def total_questions_count(self):
        if hasattr(self, '_total_questions_cache'):
            return self._total_questions_cache
        total = Question.objects.filter(
            category__in=self.form.categories.all()
        ).count()
        return self._cache_value('_total_questions_cache', total)

    @property
    def respondent_answers_count(self):
        if hasattr(self, '_respondent_answers_cache'):
            return self._respondent_answers_cache
        count = self.answers.exclude(answer_respondent__in=[None, '']).count()
        return self._cache_value('_respondent_answers_cache', count)

    @property
    def evaluator_answers_count(self):
        if hasattr(self, '_evaluator_answers_cache'):
            return self._evaluator_answers_cache
        count = self.answers.exclude(answer_evaluator__in=[None, '']).count()
        return self._cache_value('_evaluator_answers_cache', count)

    def answered_percentage(self):
        total = self.total_questions_count
        if total == 0:
            return 0
        return round((self.respondent_answers_count / total) * 100)

    def is_expired(self):
        return bool(self.valid_until and self.valid_until < timezone.now().date())

    def has_started(self):
        return self.respondent_answers_count > 0 or self.evaluator_answers_count > 0

    def refresh_status(self, commit=True):
        """
        Atualiza o status com base nas respostas, avaliação e prazo.
        """
        if self.status == 'CANCELLED':
            return False

        previous_status = self.status
        total = self.total_questions_count
        fully_answered = total > 0 and self.respondent_answers_count >= total
        fully_evaluated = total > 0 and self.evaluator_answers_count >= total

        if fully_evaluated or (fully_answered and not self.is_expired()):
            self.status = 'COMPLETED'
            if not self.completed_at:
                self.completed_at = timezone.now()
        elif self.is_expired():
            self.status = 'EXPIRED'
            if self.completed_at:
                self.completed_at = None
        elif self.has_started():
            self.status = 'IN_PROGRESS'
            if self.completed_at:
                self.completed_at = None
        else:
            self.status = 'PENDING'
            if self.completed_at:
                self.completed_at = None

        if self.status != previous_status:
            if commit:
                self.save(update_fields=['status', 'completed_at'])
            return True
        return False


class Answer(models.Model):
    answer_respondent = models.CharField(max_length=2, choices=ANSWER_CHOICES)
    attachment_respondent = models.FileField(upload_to=rename_attachment_respondent, blank=True, null=True)
    date_respondent = models.DateField(blank=True, null=True)
    
    answer_evaluator = models.CharField(max_length=2, choices=ANSWER_CHOICES, blank=True, null=True)
    attachment_evaluator = models.FileField(upload_to=rename_attachment_evaluator, blank=True, null=True)
    date_evaluator = models.DateField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name='answers')
    evaluation = models.ForeignKey(Evaluation, on_delete=models.PROTECT, related_name='answers')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='answers')


    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['evaluation', 'question'] , name='unique_answer_per_question_in_evaluation')
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.evaluation.refresh_status()

    def __str__(self):
        return f"Answer {self.id} - {self.get_answer_respondent_display()}"
    

def rename_attachment_action_plan(instance, filename):
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('attachments', 'action_plan', timezone.now().strftime("%Y/%m"), new_filename)

class ActionPlan(models.Model):
    RESPONSE_STATUS = [
        ('IN_PROGRESS', 'Em Progresso'),
        ('COMPLETED', 'Concluído'),
        ('PENDING', 'Pendente'),
    ]

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='action_plans')
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='action_plans')
    description = models.TextField()
    response_company = models.TextField(null=True, blank=True)
    response_choice = models.CharField(max_length=2, choices=ANSWER_CHOICES, null=True, blank=True)
    response_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)
    responsible = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=RESPONSE_STATUS, default='PENDING')
    attachment = models.FileField(upload_to=rename_attachment_action_plan, blank=True, null=True)

    def __str__(self):
        return f"Action Plan for {self.company.name} - Evaluation {self.evaluation.id}"

class Polo(models.Model):
    name = models.CharField("Nome do Polo", max_length=255, unique=True)
    description = models.TextField("Descrição", blank=True)
    companies = models.ManyToManyField(Company, related_name="poles", blank=True)
    users = models.ManyToManyField(
        User,
        related_name="poles",
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Polo"
        verbose_name_plural = "Polos"
        ordering = ("name",)

    def __str__(self):
        return self.name

    def add_user(self, user):
        self.users.add(user)

