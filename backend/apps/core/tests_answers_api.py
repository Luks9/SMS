from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import Answer, CategoryQuestion, Company, Evaluation, Form, Question, StoredFile


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

    def test_create_answer_without_company_field_uses_evaluation_company(self):
        payload = {
            "answer_respondent": "C",
            "date_respondent": timezone.now().date().isoformat(),
            "question": self.question.id,
            "evaluation": self.evaluation.id,
        }

        response = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company"], self.company.id)

    def test_create_answer_with_remote_file_backfills_file_company(self):
        remote_file = StoredFile.objects.create(
            uploaded_by=self.user,
            company=None,
            provider=StoredFile.Provider.LOCAL,
            provider_item_id="attachments/resumable/file-1.pdf",
            drive_id="local",
            file_name="file-1.pdf",
            original_file_name="file-1.pdf",
            file_size=1024,
            content_type="application/pdf",
            field_slot=StoredFile.FieldSlot.ANSWER_RESPONDENT,
        )

        payload = {
            "answer_respondent": "C",
            "date_respondent": timezone.now().date().isoformat(),
            "question": self.question.id,
            "evaluation": self.evaluation.id,
            "attachment_respondent_file_id": str(remote_file.id),
        }

        response = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        remote_file.refresh_from_db()
        self.assertEqual(remote_file.company_id, self.company.id)

    def test_user_without_access_cannot_answer_other_company_evaluation(self):
        outsider = User.objects.create_user(
            username="outsider.user",
            email="outsider@empresa.com",
            password="SenhaForte123!",
        )
        self.client.force_authenticate(user=outsider)

        payload = {
            "answer_respondent": "C",
            "date_respondent": timezone.now().date().isoformat(),
            "question": self.question.id,
            "evaluation": self.evaluation.id,
        }

        response = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("permiss", str(response.data).lower())

    def test_multiple_company_users_can_submit_without_global_company_context(self):
        users_and_evaluations = []
        for idx in range(1, 4):
            user = User.objects.create_user(
                username=f"user.multi.{idx}",
                email=f"user.multi.{idx}@empresa.com",
                password="SenhaForte123!",
            )
            company = Company.objects.create(
                name=f"Empresa Multi {idx}",
                cnpj=f"10.000.000/000{idx}-0{idx}",
                is_active=True,
            )
            company.users.add(user)
            evaluation = Evaluation.objects.create(
                company=company,
                evaluator=user,
                form=self.form,
                valid_until=timezone.now().date() + timedelta(days=10),
                period=timezone.now().date().replace(day=1),
                is_active=True,
            )
            users_and_evaluations.append((user, evaluation))

        for user, evaluation in users_and_evaluations:
            self.client.force_authenticate(user=user)
            payload = {
                "answer_respondent": "C",
                "date_respondent": timezone.now().date().isoformat(),
                "question": self.question.id,
                "evaluation": evaluation.id,
            }
            response = self.client.post("/api/answers/", payload, format="multipart")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data["company"], evaluation.company_id)

    def test_create_answer_evaluator_only_without_respondent_answer(self):
        payload = {
            "answer_evaluator": "C",
            "date_evaluator": timezone.now().date().isoformat(),
            "note": "Avaliado sem resposta da empresa ainda",
            "question": self.question.id,
            "evaluation": self.evaluation.id,
        }

        response = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        answer = Answer.objects.get(evaluation=self.evaluation, question=self.question)
        self.assertEqual(answer.answer_evaluator, "C")
        self.assertEqual(answer.answer_respondent, "")
        self.assertEqual(answer.company_id, self.company.id)

    def test_evaluator_only_answer_still_blocked_after_deadline(self):
        self.evaluation.valid_until = timezone.now().date() - timedelta(days=1)
        self.evaluation.save()

        payload = {
            "answer_evaluator": "C",
            "date_evaluator": timezone.now().date().isoformat(),
            "question": self.question.id,
            "evaluation": self.evaluation.id,
        }
        response = self.client.post("/api/answers/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_answer_with_multipart_file_does_not_crash(self):
        answer = Answer.objects.create(
            question=self.question,
            evaluation=self.evaluation,
            company=self.company,
            answer_respondent="C",
            date_respondent=timezone.now().date(),
        )
        file_obj = SimpleUploadedFile(
            "evidencia.zip",
            b"x" * (256 * 1024),
            content_type="application/zip",
        )

        response = self.client.patch(
            f"/api/answers/{answer.id}/",
            {
                "answer_respondent": "C",
                "date_respondent": timezone.now().date().isoformat(),
                "attachment_respondent": file_obj,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
