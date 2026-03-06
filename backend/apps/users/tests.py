from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory

from apps.users.backends import CustomAdfsBackend
from apps.users.views import CustomLoginView


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
