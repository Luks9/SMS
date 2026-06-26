from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ActionPlan, CategoryQuestion, Company, Evaluation, Form


class MonthlyDashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = timezone.now().date()

        self.admin = User.objects.create_superuser(
            username="admin",
            email="admin@test.com",
            password="123456",
        )
        self.user = User.objects.create_user(
            username="empresa",
            email="empresa@test.com",
            password="123456",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="123456",
        )

        self.company_a = Company.objects.create(name="Alpha Industria", cnpj="00.000.000/0001-91", is_active=True)
        self.company_b = Company.objects.create(name="Beta Servicos", cnpj="00.000.000/0002-91", is_active=True)
        self.company_a.users.add(self.user)
        self.company_b.users.add(self.other_user)

        category = CategoryQuestion.objects.create(name="Categoria Base", weight=1)
        self.form = Form.objects.create(name="Formulario Base", is_active=True)
        self.form.categories.add(category)

    def test_monthly_dashboard_kpis_and_status(self):
        evaluation = Evaluation.objects.create(
            company=self.company_a,
            evaluator=self.admin,
            form=self.form,
            valid_until=self.today + timedelta(days=10),
            period=self.today,
            is_active=True,
            status="COMPLETED",
            completed_at=timezone.now(),
        )
        ActionPlan.objects.create(
            company=self.company_a,
            evaluation=evaluation,
            description="Enviar evidencia",
            status="PENDING",
            end_date=self.today - timedelta(days=1),
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get(
            "/api/dashboard/monthly/",
            {"month": self.today.month, "year": self.today.year},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["kpis"]["eligible"], 2)
        self.assertEqual(data["kpis"]["completed"], 1)
        self.assertEqual(data["kpis"]["pending"], 1)
        self.assertEqual(data["kpis"]["actions_pending"], 1)
        self.assertEqual(data["kpis"]["actions_overdue"], 1)
        self.assertEqual(len(data["actions"]), 1)
        self.assertEqual(data["actions"][0]["status"], "overdue")

    def test_monthly_dashboard_respects_company_scope_for_regular_user(self):
        Evaluation.objects.create(
            company=self.company_a,
            evaluator=self.admin,
            form=self.form,
            valid_until=self.today + timedelta(days=10),
            period=self.today,
            is_active=True,
            status="IN_PROGRESS",
        )
        Evaluation.objects.create(
            company=self.company_b,
            evaluator=self.admin,
            form=self.form,
            valid_until=self.today + timedelta(days=10),
            period=self.today,
            is_active=True,
            status="PENDING",
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(
            "/api/dashboard/monthly/",
            {"month": self.today.month, "year": self.today.year},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["kpis"]["eligible"], 1)
        self.assertEqual(len(data["companies"]), 1)
        self.assertEqual(data["companies"][0]["company_id"], self.company_a.id)

    def test_company_monthly_detail_forbidden_when_user_has_no_access(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            f"/api/companies/{self.company_b.id}/monthly-detail/",
            {"month": self.today.month, "year": self.today.year},
        )
        self.assertEqual(response.status_code, 403)
