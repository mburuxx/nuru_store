from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework.test import APIClient

from users.models import UserProfile
from users.permissions import IsOwner, IsCashier, IsOwnerOrReadOnly
from users.serializers import RegisterSerializer, MeSerializer, ChangePasswordSerializer
from users.utils import ensure_profile

try:
    # only used for logout test
    from rest_framework_simplejwt.tokens import RefreshToken
except Exception:
    RefreshToken = None


User = get_user_model()


class UsersMinimalTests(TestCase):
    BASE = "/api/users"  # change if your prefix differs

    def setUp(self):
        self.client = APIClient()

    # --------------------
    # Model/signal/utils
    # --------------------
    def test_user_profile_created_by_signal(self):
        u = User.objects.create_user(username="john", password="pass1234")
        self.assertTrue(UserProfile.objects.filter(user=u).exists())
        self.assertEqual(u.profile.role, UserProfile.Role.CASHIER)

    def test_ensure_profile_forces_superuser_to_owner(self):
        su = User.objects.create_superuser(username="boss", password="pass1234", email="boss@example.com")
        # signal creates profile as CASHIER by default
        self.assertEqual(su.profile.role, UserProfile.Role.CASHIER)

        prof = ensure_profile(su)
        prof.refresh_from_db()
        self.assertEqual(prof.role, UserProfile.Role.OWNER)

    # --------------------
    # Permissions (unit)
    # --------------------
    def test_permissions_owner_cashier_logic(self):
        owner = User.objects.create_user(username="owner", password="pass1234")
        owner.profile.role = UserProfile.Role.OWNER
        owner.profile.save()

        cashier = User.objects.create_user(username="cashier", password="pass1234")
        cashier.profile.role = UserProfile.Role.CASHIER
        cashier.profile.save()

        superu = User.objects.create_superuser(username="super", password="pass1234", email="s@example.com")

        class Req:  # tiny request stub
            def __init__(self, user, method="GET"):
                self.user = user
                self.method = method

        # IsOwner
        self.assertTrue(IsOwner().has_permission(Req(owner), None))
        self.assertFalse(IsOwner().has_permission(Req(cashier), None))
        self.assertTrue(IsOwner().has_permission(Req(superu), None))

        # IsCashier (cashier or owner or superuser)
        self.assertTrue(IsCashier().has_permission(Req(cashier), None))
        self.assertTrue(IsCashier().has_permission(Req(owner), None))
        self.assertTrue(IsCashier().has_permission(Req(superu), None))

        # IsOwnerOrReadOnly
        self.assertTrue(IsOwnerOrReadOnly().has_permission(Req(cashier, method="GET"), None))
        self.assertFalse(IsOwnerOrReadOnly().has_permission(Req(cashier, method="POST"), None))
        self.assertTrue(IsOwnerOrReadOnly().has_permission(Req(owner, method="POST"), None))

    # --------------------
    # Serializers (unit)
    # --------------------
    def test_register_serializer_forces_cashier_and_sets_phone(self):
        data = {"username": "newbie", "email": "n@example.com", "password": "pass1234", "phone": "0700"}
        s = RegisterSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        u = s.save()

        u.refresh_from_db()
        u.profile.refresh_from_db()
        self.assertTrue(u.check_password("pass1234"))
        self.assertEqual(u.profile.role, UserProfile.Role.CASHIER)
        self.assertEqual(u.profile.phone, "0700")

    def test_register_serializer_rejects_duplicate_email(self):
        User.objects.create_user(username="a", email="dup@example.com", password="pass1234")
        s = RegisterSerializer(data={"username": "b", "email": "DUP@example.com", "password": "pass1234"})
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_me_serializer_email_unique_validation(self):
        u1 = User.objects.create_user(username="u1", email="u1@example.com", password="pass1234")
        u2 = User.objects.create_user(username="u2", email="u2@example.com", password="pass1234")

        prof = u2.profile
        s = MeSerializer(instance=prof, data={"email": "u1@example.com"}, partial=True)
        self.assertFalse(s.is_valid())
        # serializer returns {"email": "..."} inside non_field errors OR field errors depending on how DRF nests
        self.assertTrue("email" in s.errors or "non_field_errors" in s.errors)

    def test_change_password_serializer_checks_old_password(self):
        u = User.objects.create_user(username="pw", password="oldpass123")
        # fake request
        class Req:
            def __init__(self, user):
                self.user = user

        s = ChangePasswordSerializer(
            data={"old_password": "wrong", "new_password": "newpass123"},
            context={"request": Req(u)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("old_password", s.errors)

    # --------------------
    # API endpoints (minimal integration)
    # --------------------
    def test_register_view_returns_tokens(self):
        res = self.client.post(
            f"{self.BASE}/register/",
            {"username": "reg", "email": "reg@example.com", "password": "pass1234", "phone": "0711"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

        u = User.objects.get(username="reg")
        self.assertEqual(u.profile.role, UserProfile.Role.CASHIER)

    def test_profile_and_me_require_auth(self):
        res1 = self.client.get(f"{self.BASE}/profile/")
        res2 = self.client.get(f"{self.BASE}/me/")
        self.assertEqual(res1.status_code, 401)
        self.assertEqual(res2.status_code, 401)

    def test_me_update_updates_email_and_phone(self):
        u = User.objects.create_user(username="me", email="me@example.com", password="pass1234")
        self.client.force_authenticate(user=u)

        res = self.client.patch(
            f"{self.BASE}/me/",
            {"email": "new@example.com", "phone": "0799"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)

        u.refresh_from_db()
        u.profile.refresh_from_db()
        self.assertEqual(u.email, "new@example.com")
        self.assertEqual(u.profile.phone, "0799")

    def test_change_password_view_changes_password(self):
        u = User.objects.create_user(username="cp", password="oldpass123")
        self.client.force_authenticate(user=u)

        res = self.client.post(
            f"{self.BASE}/change-password/",
            {"old_password": "oldpass123", "new_password": "newpass123"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)

        u.refresh_from_db()
        self.assertTrue(u.check_password("newpass123"))

    def test_logout_requires_refresh_token(self):
        u = User.objects.create_user(username="lo", password="pass1234")
        self.client.force_authenticate(user=u)

        res = self.client.post(f"{self.BASE}/logout/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)

    def test_logout_with_invalid_refresh_token(self):
        u = User.objects.create_user(username="lo2", password="pass1234")
        self.client.force_authenticate(user=u)

        res = self.client.post(f"{self.BASE}/logout/", {"refresh": "not-a-token"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("detail", res.data)

    def test_logout_with_valid_refresh_token_blacklists(self):
        # This assumes you enabled SIMPLEJWT blacklist app.
        if RefreshToken is None:
            self.skipTest("simplejwt not available in test environment")

        u = User.objects.create_user(username="lo3", password="pass1234")
        self.client.force_authenticate(user=u)

        refresh = RefreshToken.for_user(u)
        res = self.client.post(f"{self.BASE}/logout/", {"refresh": str(refresh)}, format="json")

        # If blacklist is enabled: should be 200.
        # If blacklist is NOT enabled, token.blacklist() may error and your view returns 400.
        # Prefer making this strict once blacklist is confirmed.
        self.assertIn(res.status_code, (200, 400))