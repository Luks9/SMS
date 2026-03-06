from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory

from apps.users.backends import CustomAdfsBackend
from apps.users.views import CustomLoginView
from apps.core.models import Company
from apps.users.utils.domain_utils import associate_user_with_company_by_domain, clean_username


class CustomLoginViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CustomLoginView.as_view()

    def test_returns_401_when_authorization_header_is_missing(self):
        request = self.factory.post("/api/users/login/")
        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Token nao fornecido.")

    @patch("apps.users.views.authenticate", return_value=None)
    def test_passes_bearer_token_as_string_to_authenticate(self, authenticate_mock):
        request = self.factory.post(
            "/api/users/login/",
            HTTP_AUTHORIZATION="Bearer fake.jwt.token",
        )

        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        authenticate_mock.assert_called_once()
        _, kwargs = authenticate_mock.call_args
        self.assertEqual(kwargs["access_token"], "fake.jwt.token")
        self.assertIsInstance(kwargs["access_token"], str)


class CustomAdfsBackendTests(SimpleTestCase):
    @patch("django_auth_adfs.backend.AdfsAccessTokenBackend.authenticate", return_value=None)
    def test_authenticate_accepts_string_token(self, parent_authenticate_mock):
        backend = CustomAdfsBackend()

        backend.authenticate(request=None, access_token="fake.jwt.token")

        parent_authenticate_mock.assert_called_once()
        _, kwargs = parent_authenticate_mock.call_args
        self.assertEqual(kwargs["access_token"], b"fake.jwt.token")


class CustomLoginFallbackTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CustomLoginView.as_view()
        self.user = User.objects.create_user(
            username="empresa@dominio.com",
            email="empresa@dominio.com",
            password="123456",
        )
        self.company = Company.objects.create(
            name="Empresa Teste",
            cnpj="00.000.000/0001-91",
            dominio="dominio.com",
            is_active=True,
        )
        self.user.companies.add(self.company)
        self.user.groups.clear()

    @patch("apps.users.views.authenticate")
    def test_login_allows_non_superuser_without_group_when_company_exists(self, authenticate_mock):
        authenticate_mock.return_value = self.user
        request = self.factory.post(
            "/api/users/login/",
            HTTP_AUTHORIZATION="Bearer fake.jwt.token",
        )

        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)


class DomainAssociationTests(SimpleTestCase):
    @patch("apps.users.utils.domain_utils.Group.objects.get")
    @patch("apps.users.utils.domain_utils.Company.objects.filter")
    def test_domain_association_preserves_existing_company_links(self, company_filter_mock, group_get_mock):
        class FakeCompanies:
            def __init__(self):
                self.ids = {10}

            def filter(self, **kwargs):
                company_id = kwargs.get("id")

                class Result:
                    def __init__(self, exists_value):
                        self._exists = exists_value

                    def exists(self):
                        return self._exists

                return Result(company_id in self.ids)

            def add(self, company):
                self.ids.add(company.id)

        class FakeGroups:
            def filter(self, **kwargs):
                class Result:
                    def exists(self):
                        return False

                return Result()

            def add(self, *_groups):
                return None

        class FakeUser:
            def __init__(self):
                self.username = "carlos.formiga@petroeng.com.br"
                self.id = 1
                self.is_staff = False
                self.is_superuser = False
                self.companies = FakeCompanies()
                self.groups = FakeGroups()

            def save(self, **_kwargs):
                return None

        fake_company = type("CompanyObj", (), {"id": 20, "name": "Petroeng"})()
        company_filter_mock.return_value.first.return_value = fake_company
        group_get_mock.return_value = type("GroupObj", (), {"id": 1})()

        user = FakeUser()
        processed = associate_user_with_company_by_domain(user)

        self.assertIsNotNone(processed)
        self.assertIn(10, processed.companies.ids)
        self.assertIn(20, processed.companies.ids)


class UsernameNormalizationTests(SimpleTestCase):
    def test_clean_username_uses_fallback_email_when_claim_has_no_domain(self):
        result = clean_username("eneil.silva", fallback_email="eneil.silva@bravaenergia.com")
        self.assertEqual(result, "eneil.silva@bravaenergia.com")

    @patch("apps.users.utils.domain_utils.User.objects.filter")
    def test_clean_username_uses_unique_localpart_match(self, filter_mock):
        class FakeQuerySet:
            def values_list(self, *_args, **_kwargs):
                return ["eneil.silva@bravaenergia.com"]

        filter_mock.return_value = FakeQuerySet()

        result = clean_username("eneil.silva")
        self.assertEqual(result, "eneil.silva@bravaenergia.com")

    @patch("apps.users.utils.domain_utils.User.objects.filter")
    def test_clean_username_returns_none_when_localpart_is_ambiguous(self, filter_mock):
        class FakeQuerySet:
            def values_list(self, *_args, **_kwargs):
                return ["eneil.silva@bravaenergia.com", "eneil.silva@outra.com"]

        filter_mock.return_value = FakeQuerySet()

        result = clean_username("eneil.silva")
        self.assertIsNone(result)
