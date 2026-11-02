"""Unit tests for deterministic Health Score calculation.

Verifies:
- RF-02: Health score calculation
- Principle P7: Real, reproducible metrics
"""

from datetime import datetime, timezone
import unittest
from backend.app.services.health_score_service import health_score_service


class TestHealthScore(unittest.TestCase):
    """Tests deterministic evaluation of open-source repository health."""

    def test_active_high_quality_repository(self):
        """Active repository with OSI license, good community and documentation should score high."""
        repo_data = {
            "pushed_at": datetime.now(timezone.utc).isoformat(),
            "open_issues_count": 15,
            "stars_count": 3500,
            "forks_count": 800,
            "license_spdx": "MIT",
            "is_archived": False,
            "description": "Production-grade database toolkit with full documentation.",
            "readme_content": "# Documentation\n" + ("Detailed architecture guide...\n" * 100),
        }
        breakdown = health_score_service.calculate_health_score(repo_data)
        self.assertGreaterEqual(breakdown.total_score, 85.0)
        self.assertEqual(breakdown.commit_frequency_score, 25.0)
        self.assertEqual(breakdown.license_score, 20.0)
        self.assertFalse(breakdown.penalty_archived)

    def test_archived_repository_penalty(self):
        """Archived repositories must receive substantial penalty."""
        repo_data = {
            "pushed_at": "2021-01-01T00:00:00Z",
            "open_issues_count": 500,
            "stars_count": 1000,
            "forks_count": 200,
            "license_spdx": "MIT",
            "is_archived": True,
            "description": "Legacy old project",
            "readme_content": "No longer maintained.",
        }
        breakdown = health_score_service.calculate_health_score(repo_data)
        self.assertTrue(breakdown.penalty_archived)
        self.assertLessEqual(breakdown.total_score, 30.0)

    def test_no_license_penalty(self):
        """Repositories without valid OSI license get 0 license points."""
        repo_data = {
            "pushed_at": datetime.now(timezone.utc).isoformat(),
            "open_issues_count": 0,
            "stars_count": 50,
            "forks_count": 5,
            "license_spdx": "NOASSERTION",
            "is_archived": False,
            "description": "Short description",
            "readme_content": "",
        }
        breakdown = health_score_service.calculate_health_score(repo_data)
        self.assertEqual(breakdown.license_score, 0.0)

    def test_score_bounds(self):
        """Scores must strictly stay within 0.0 and 100.0."""
        empty_repo = {}
        breakdown = health_score_service.calculate_health_score(empty_repo)
        self.assertGreaterEqual(breakdown.total_score, 0.0)
        self.assertLessEqual(breakdown.total_score, 100.0)


if __name__ == "__main__":
    unittest.main()

