from datetime import date
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import (
    Answer,
    CategoryQuestion,
    Company,
    Evaluation,
    Form,
    Question,
    StoredFile,
    UploadSession,
)


class UploadEndpointsTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="upload.user", password="123456")
        self.client.force_authenticate(user=self.user)

        self.company = Company.objects.create(name="Company A", cnpj="00.000.000/0001-91", is_active=True)
        self.company.users.add(self.user)
        self.category = CategoryQuestion.objects.create(name="Cat", weight=1)
        self.form = Form.objects.create(name="Form A")
        self.form.categories.add(self.category)
        self.question = Question.objects.create(category=self.category, question="Q1?", is_active=True)
        self.evaluation = Evaluation.objects.create(
            company=self.company,
            evaluator=self.user,
            form=self.form,
            valid_until=date(2099, 1, 1),
            period=date(2099, 1, 1),
        )
        self.answer = Answer.objects.create(
            question=self.question,
            evaluation=self.evaluation,
            company=self.company,
            answer_respondent="C",
        )

    @patch("apps.core.upload_views.create_upload_session_for_user")
    def test_upload_init(self, mocked_create):
        upload = UploadSession(
            id=uuid4(),
            user=self.user,
            status=UploadSession.Status.IN_PROGRESS,
            file_name="file.pdf",
            original_file_name="file.pdf",
            file_size=1024,
            content_type="application/pdf",
            chunk_size=5 * 1024 * 1024,
            upload_url="https://upload.example",
            drive_id="drive",
        )
        mocked_create.return_value = upload

        response = self.client.post(
            "/api/uploads/init/",
            {"file_name": "file.pdf", "file_size": 1024, "content_type": "application/pdf"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("upload_id", response.data)
        self.assertEqual(response.data["chunk_size"], 5 * 1024 * 1024)

    @patch("apps.core.upload_views.OneDriveClient.upload_chunk")
    def test_upload_chunk_updates_bytes_sent(self, mocked_upload_chunk):
        upload = UploadSession.objects.create(
            user=self.user,
            status=UploadSession.Status.IN_PROGRESS,
            file_name="big.zip",
            original_file_name="big.zip",
            file_size=10,
            content_type="application/zip",
            chunk_size=5,
            upload_url="https://upload.example",
            drive_id="drive",
            bytes_sent=0,
        )
        mocked_upload_chunk.return_value = {"complete": True, "item_id": "item-123"}

        response = self.client.put(
            f"/api/uploads/{upload.id}/chunk/",
            {
                "start": "0",
                "end": "9",
                "total": "10",
                "chunk": SimpleUploadedFile("chunk.bin", b"0123456789", content_type="application/octet-stream"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload.refresh_from_db()
        self.assertEqual(upload.bytes_sent, 10)
        self.assertEqual(upload.status, UploadSession.Status.COMPLETED)

    @patch("apps.core.upload_views.register_stored_file_from_upload")
    def test_upload_complete_links_answer_file(self, mocked_register):
        upload = UploadSession.objects.create(
            user=self.user,
            status=UploadSession.Status.COMPLETED,
            file_name="evidence.pdf",
            original_file_name="evidence.pdf",
            file_size=10,
            content_type="application/pdf",
            chunk_size=5,
            upload_url="https://upload.example",
            drive_id="drive",
            bytes_sent=10,
            onedrive_item_id="item-123",
        )
        stored = StoredFile.objects.create(
            uploaded_by=self.user,
            company=self.company,
            provider_item_id="item-123",
            drive_id="drive",
            file_name="evidence.pdf",
            original_file_name="evidence.pdf",
            file_size=10,
            content_type="application/pdf",
            field_slot=StoredFile.FieldSlot.ANSWER_RESPONDENT,
        )
        mocked_register.return_value = stored

        response = self.client.post(
            f"/api/uploads/{upload.id}/complete/",
            {
                "company_id": self.company.id,
                "answer_id": self.answer.id,
                "field_slot": StoredFile.FieldSlot.ANSWER_RESPONDENT,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.answer.refresh_from_db()
        self.assertEqual(self.answer.attachment_respondent_file_id, stored.id)
