"""Unit tests for RBAC, constant-time comparison, and token authentication.

Verifies:
- RF-06: RBAC & Access control
- RNF-01: Least privilege
- MU-05: Unauthorized access prevention
"""

import unittest
from backend.app.core.config import settings
from backend.app.core.security import (
    UserRole,
    authenticate_token,
    has_required_role,
    verify_token_constant_time,
)


class TestSecurity(unittest.TestCase):
    """Tests security primitives and role hierarchy."""

    def test_constant_time_comparison(self):
        """Should verify tokens safely with constant-time logic."""
        secret = "super-secret-production-token-12345"
        self.assertTrue(verify_token_constant_time(secret, secret))
        self.assertFalse(verify_token_constant_time("wrong-token", secret))
        self.assertFalse(verify_token_constant_time("", secret))
        self.assertFalse(verify_token_constant_time(None, secret))

    def test_role_hierarchy(self):
        """Should correctly check role weights."""
        self.assertTrue(has_required_role(UserRole.ADMIN, UserRole.ADMIN))
        self.assertTrue(has_required_role(UserRole.ADMIN, UserRole.SERVICE_ROLE))
        self.assertTrue(has_required_role(UserRole.ADMIN, UserRole.READONLY))
        self.assertTrue(has_required_role(UserRole.SERVICE_ROLE, UserRole.READONLY))
        self.assertFalse(has_required_role(UserRole.READONLY, UserRole.SERVICE_ROLE))
        self.assertFalse(has_required_role(UserRole.ANONYMOUS, UserRole.READONLY))

    def test_authenticate_token(self):
        """Should resolve correct roles based on presented keys."""
        # Admin key
        admin_token = f"Bearer {settings.admin_api_key}"
        self.assertEqual(authenticate_token(admin_token), UserRole.ADMIN)

        # Invalid token
        self.assertEqual(authenticate_token("Bearer invalid-token"), UserRole.ANONYMOUS)
        self.assertEqual(authenticate_token(None), UserRole.ANONYMOUS)
        self.assertEqual(authenticate_token(""), UserRole.ANONYMOUS)


if __name__ == "__main__":
    unittest.main()

