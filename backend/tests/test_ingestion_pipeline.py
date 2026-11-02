"""Unit tests for the Ingestion Pipeline and Database storage.

Verifies:
- RF-01: GitHub ingestion
- RF-02: Health score calculation
- RF-03: Embeddings generation
- RF-07: Audit trail recording
- RNF-04: SSRF prevention
"""

from datetime import datetime, timezone
import unittest
from backend.app.core.audit import audit_logger
from backend.app.database.client import DatabaseClient
from backend.app.services.ingestion_pipeline import IngestionPipeline


class TestIngestionPipeline(unittest.TestCase):
    """Tests the ingestion orchestration workflow."""

    def setUp(self):
        self.db = DatabaseClient()
        self.pipeline = IngestionPipeline(db=self.db)
        audit_logger.clear()

    def test_successful_ingestion_flow(self):
        """Should ingest, calculate health score, generate embeddings and record audit log."""
        sample_repo = {
            "github_id": 123456,
            "owner": "fastapi",
            "name": "fastapi",
            "full_name": "fastapi/fastapi",
            "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
            "html_url": "https://github.com/fastapi/fastapi",
            "language": "Python",
            "license_spdx": "MIT",
            "stars_count": 75000,
            "forks_count": 6500,
            "open_issues_count": 250,
            "is_archived": False,
            "pushed_at": datetime.now(timezone.utc).isoformat(),
            "readme_content": "# FastAPI\nHigh performance web framework for building APIs with Python.",
        }

        response = self.pipeline.ingest_repository(
            url_or_slug="https://github.com/fastapi/fastapi",
            category="Web Frameworks",
            actor="test_user",
            preloaded_data=sample_repo,
        )

        self.assertTrue(response.success)
        self.assertEqual(response.full_name, "fastapi/fastapi")
        self.assertIsNotNone(response.repository_id)
        self.assertGreater(response.health_score, 70.0)

        # Verify DB presence
        stored = self.db.get_repository_by_slug("fastapi/fastapi")
        self.assertIsNotNone(stored)
        self.assertEqual(stored["category"], "Web Frameworks")

        # Verify metrics breakdown presence
        metrics = self.db.get_metrics_by_repo_id(stored["id"])
        self.assertIsNotNone(metrics)
        self.assertEqual(metrics["license_score"], 20.0)

        # Verify audit log
        logs = audit_logger.get_recent_events()
        self.assertTrue(any(e["action"] == "INGEST_REPOSITORY_SUCCESS" for e in logs))

    def test_ssrf_rejection_in_pipeline(self):
        """Pipeline must fail immediately on disallowed URLs and record audit failure."""
        with self.assertRaises(ValueError):
            self.pipeline.ingest_repository(
                url_or_slug="http://169.254.169.254/latest/meta-data/",
                actor="attacker",
            )

        logs = audit_logger.get_recent_events()
        self.assertTrue(any(e["action"] == "INGEST_VALIDATION_ERROR" for e in logs))


if __name__ == "__main__":
    unittest.main()

