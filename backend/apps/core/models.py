from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

class Company(models.Model):
    name = models.CharField(max_length=255)
    cnpj = models.CharField(max_length=18, unique=True)
    is_active = models.BooleanField(default=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='companies')  # Relacionando Company a User

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def __str__(self):
        return self.name

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
    category = models.ForeignKey(CategoryQuestion, on_delete=models.CASCADE, related_name='subcategories')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Subcategoria"
        verbose_name_plural = "Subcategorias"

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class Question(models.Model):
    category = models.ForeignKey(CategoryQuestion, on_delete=models.CASCADE)
    subcategory = models.ForeignKey(Subcategory, on_delete=models.CASCADE, blank=True, null=True, related_name='questions')
    question = models.TextField()
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
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='evaluations')
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations')
    form = models.ForeignKey(Form, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateField(default=timezone.now)  # Define uma data padrão como a data atual
    score = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Evaluation {self.id} - {self.company.name}"


class Answer(models.Model):
    ANSWER_CHOICES = [
        ('NA', 'Não Aplicável'),
        ('C', 'Conforme'),
        ('NC', 'Não Conforme'),
        ('A', 'Em Análise'),
    ]

    # Resposta do avaliado (empresa)
    answer_respondent = models.CharField(max_length=2, choices=ANSWER_CHOICES)
    attachment_respondent = models.FileField(upload_to='attachments/respondent/', blank=True, null=True)
    date_respondent = models.DateField(auto_now_add=True)
    
    # Resposta do avaliador (administrador)
    answer_evaluator = models.CharField(max_length=2, choices=ANSWER_CHOICES, blank=True, null=True)
    attachment_evaluator = models.FileField(upload_to='attachments/evaluator/', blank=True, null=True)
    date_evaluator = models.DateField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='answers')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='answers')

    def __str__(self):
        return f"Answer {self.id} - {self.get_answer_respondent_display()}"
    

    # def get_answer_value(self, answer):
    #     # Atribui um valor numérico com base no tipo de resposta
    #     if answer == 'C':
    #         return 1
    #     elif answer == 'NC':
    #         return 0
    #     elif answer == 'NA':
    #         return 0.5
    #     elif answer == 'A':
    #         return 0.75
    #     return 0


