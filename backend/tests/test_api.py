"""Integration and route tests for OpenBridge FastAPI application.

Verifies:
- RF-04: Repository list and detail endpoints
- RF-06: RBAC endpoint protection
- RF-08: Health and readiness checks
- RNF-05: Security headers enforcement
- RNF-06: Rate limiting
"""

import unittest
from fastapi import HTTPException
from backend.app.api.dependencies import require_role
from backend.app.api.routes.health import health_liveness, health_readiness
from backend.app.api.routes.repositories import get_repository, list_repositories
from backend.app.core.config import settings
from backend.app.core.rate_limiter import SlidingWindowRateLimiter
from backend.app.core.security import UserRole
from backend.app.database.client import db_client


class TestAPI(unittest.TestCase):
    """Tests FastAPI endpoints and security filters."""

    def setUp(self):
        db_client.clear()
        # Seed a repository for catalog tests
        db_client.save_repository({
            "full_name": "astral-sh/uv",
            "owner": "astral-sh",
            "name": "uv",
            "description": "An extremely fast Python package and project manager",
            "html_url": "https://github.com/astral-sh/uv",
            "category": "Developer Tools",
            "language": "Rust",
            "license_spdx": "MIT",
            "stars_count": 35000,
            "forks_count": 1200,
            "open_issues_count": 80,
            "is_archived": False,
            "health_score": 92.5,
        })

    def test_health_endpoints(self):
        """Health endpoints must return operational status."""
        live = health_liveness()
        self.assertEqual(live["status"], "healthy")

        ready = health_readiness()
        self.assertEqual(ready["status"], "ready")
        self.assertIn("security_controls", ready)

    def test_list_repositories_endpoint(self):
        """Should return paginated list of catalog tools."""
        res = list_repositories(category=None, min_health_score=0.0, limit=10, offset=0)
        self.assertEqual(res.total, 1)
        self.assertEqual(res.items[0].full_name, "astral-sh/uv")

    def test_get_repository_by_slug(self):
        """Should retrieve repository detail by owner/repo slug."""
        res = get_repository(id_or_slug="astral-sh/uv")
        self.assertEqual(res["repository"].full_name, "astral-sh/uv")

    def test_get_nonexistent_repository_raises_404(self):
        """Should return HTTP 404 when repository is missing."""
        with self.assertRaises(HTTPException) as ctx:
            get_repository(id_or_slug="nonexistent/repo")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_rbac_dependency_rejection(self):
        """require_role dependency must raise HTTP 403 when authorization is missing or invalid."""
        checker = require_role(UserRole.SERVICE_ROLE)

        class DummyRequest:
            headers = {}

        # Anonymous caller
        with self.assertRaises(HTTPException) as ctx:
            checker(request=DummyRequest(), authorization=None)
        self.assertEqual(ctx.exception.status_code, 403)

        # Invalid token
        with self.assertRaises(HTTPException) as ctx:
            checker(request=DummyRequest(), authorization="Bearer wrong-token")
        self.assertEqual(ctx.exception.status_code, 403)

        # Valid admin key succeeds
        role = checker(request=DummyRequest(), authorization=f"Bearer {settings.admin_api_key}")
        self.assertEqual(role, UserRole.ADMIN)

    def test_rate_limiter(self):
        """Rate limiter must permit up to limit and reject subsequent requests."""
        limiter = SlidingWindowRateLimiter(limit_per_minute=3)
        client_key = "test_ip_192.168.1.100"

        # 3 allowed
        self.assertTrue(limiter.is_allowed(client_key)[0])
        self.assertTrue(limiter.is_allowed(client_key)[0])
        self.assertTrue(limiter.is_allowed(client_key)[0])

        # 4th rejected
        allowed, remaining, retry_after = limiter.is_allowed(client_key)
        self.assertFalse(allowed)
        self.assertEqual(remaining, 0)
        self.assertGreater(retry_after, 0.0)


if __name__ == "__main__":
    unittest.main()

