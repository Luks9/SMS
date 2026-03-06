from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import CategoryQuestion, Company, Evaluation, Form, Question


class AnswerApiIdempotencyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="resposta.teste",
            email="resposta.teste@empresa.com",
            password="SenhaForte123!",
        )

        self.company = Company.objects.create(
            name="Empresa Teste",
            cnpj="12.345.678/0001-90",
            is_active=True,
        )
        self.company.users.add(self.user)

        self.category = CategoryQuestion.objects.create(
            name="Categoria",
            weight=1,
            is_active=True,
        )
        self.question = Question.objects.create(
            category=self.category,
            question="Pergunta de teste",
            recommendation="Recomendacao",
            is_active=True,
        )
        self.form = Form.objects.create(name="Formulario Teste", is_active=True)
        self.form.categories.add(self.category)

        today = timezone.now().date()
        self.evaluation = Evaluation.objects.create(
            company=self.company,
            evaluator=self.user,
            form=self.form,
            valid_until=today + timedelta(days=10),
            period=today.replace(day=1),
            is_active=True,
        )

        self.client.force_authenticate(user=self.user)

    def test_create_answer_twice_updates_existing_instead_of_500(self):
        payload = {
            "answer_respondent": "C",
            "date_respondent": timezone.now().date().isoformat(),
            "question": self.question.id,
            "evaluation": self.evaluation.id,
            "company": self.company.id,
        }

        first = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        payload["answer_respondent"] = "NC"
        second = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["id"], second.data["id"])
