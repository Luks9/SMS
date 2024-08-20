from django.contrib.auth.models import User
from django.db import models

class Company(models.Model):
    name = models.CharField(max_length=255)
    cnpj = models.CharField(max_length=18, unique=True)
    is_active = models.BooleanField(default=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='companies')  # Relacionando Company a User

    def __str__(self):
        return self.name

class CategoryQuestion(models.Model):
    name = models.CharField(max_length=255)
    weight = models.FloatField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Question(models.Model):
    category = models.ForeignKey(CategoryQuestion, on_delete=models.CASCADE)
    question = models.TextField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.question

class Form(models.Model):
    categories = models.ManyToManyField(CategoryQuestion)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Form {self.id}"

class Answer(models.Model):
    ANSWER_CHOICES = [
        ('NA', 'Não Aplicável'),
        ('C', 'Conforme'),
        ('NC', 'Não Conforme'),
        ('A', 'Em Análise'),
    ]

    answer = models.CharField(max_length=2, choices=ANSWER_CHOICES)
    attachment = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateField()
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    category = models.ForeignKey(CategoryQuestion, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    def __str__(self):
        return f"Answer {self.id} - {self.get_answer_display()}"