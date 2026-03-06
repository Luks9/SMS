from django.test import SimpleTestCase

from apps.users.views import _compute_scoped_company_changes


class ScopedCompanySyncTests(SimpleTestCase):
    def test_preserves_other_poles_when_updating_current_pole(self):
        current = {1, 2, 3}
        scoped = {2, 3}
        requested = {3}
        remove_ids, add_ids = _compute_scoped_company_changes(current, scoped, requested)

        self.assertEqual(remove_ids, {2})
        self.assertEqual(add_ids, set())
        final = (current - remove_ids) | add_ids
        self.assertEqual(final, {1, 3})

    def test_adds_multiple_companies_in_same_pole(self):
        current = {1}
        scoped = {2, 3, 4}
        requested = {2, 3, 4}
        remove_ids, add_ids = _compute_scoped_company_changes(current, scoped, requested)

        self.assertEqual(remove_ids, set())
        self.assertEqual(add_ids, {2, 3, 4})

    def test_remove_in_pole_b_does_not_affect_pole_a(self):
        current = {10, 20, 30}
        scoped = {20, 30}
        requested = {20}
        remove_ids, add_ids = _compute_scoped_company_changes(current, scoped, requested)

        self.assertEqual(remove_ids, {30})
        self.assertEqual(add_ids, set())
        final = (current - remove_ids) | add_ids
        self.assertEqual(final, {10, 20})

    def test_idempotent_sync(self):
        current = {5, 6}
        scoped = {5, 6}
        requested = {5, 6}
        remove_ids, add_ids = _compute_scoped_company_changes(current, scoped, requested)

        self.assertEqual(remove_ids, set())
        self.assertEqual(add_ids, set())

    def test_empty_request_clears_only_scoped_companies(self):
        current = {100, 200, 300}
        scoped = {200, 300}
        requested = set()
        remove_ids, add_ids = _compute_scoped_company_changes(current, scoped, requested)

        self.assertEqual(remove_ids, {200, 300})
        self.assertEqual(add_ids, set())
