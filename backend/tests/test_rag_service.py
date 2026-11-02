"""Unit tests for RAG semantic search and recommendation engine.

Verifies:
- RF-05: Semantic search
- Principle P6: The assistant does not invent (Zero hallucination guarantee)
- OWASP LLM09: Misinformation mitigation
"""

from datetime import datetime, timezone
import unittest
from backend.app.database.client import DatabaseClient
from backend.app.schemas.rag import RAGQueryRequest
from backend.app.services.ingestion_pipeline import IngestionPipeline
from backend.app.services.rag_service import RAGService


class TestRAGService(unittest.TestCase):
    """Tests RAG semantic matching and citation guarantees."""

    def setUp(self):
        self.db = DatabaseClient()
        self.pipeline = IngestionPipeline(db=self.db)
        self.rag = RAGService(db=self.db)

        # Seed two distinct repositories
        self.pipeline.ingest_repository(
            url_or_slug="https://github.com/supabase/supabase",
            category="Database",
            preloaded_data={
                "github_id": 11,
                "owner": "supabase",
                "name": "supabase",
                "full_name": "supabase/supabase",
                "description": "The open source Firebase alternative with PostgreSQL database, auth and realtime",
                "html_url": "https://github.com/supabase/supabase",
                "language": "TypeScript",
                "license_spdx": "Apache-2.0",
                "stars_count": 68000,
                "forks_count": 5200,
                "open_issues_count": 400,
                "is_archived": False,
                "pushed_at": datetime.now(timezone.utc).isoformat(),
                "readme_content": "Supabase open source Postgres backend service.",
            },
        )

        self.pipeline.ingest_repository(
            url_or_slug="https://github.com/pallets/flask",
            category="Web Frameworks",
            preloaded_data={
                "github_id": 22,
                "owner": "pallets",
                "name": "flask",
                "full_name": "pallets/flask",
                "description": "The Python micro framework for building web applications",
                "html_url": "https://github.com/pallets/flask",
                "language": "Python",
                "license_spdx": "BSD-3-Clause",
                "stars_count": 66000,
                "forks_count": 15000,
                "open_issues_count": 10,
                "is_archived": False,
                "pushed_at": datetime.now(timezone.utc).isoformat(),
                "readme_content": "Flask micro framework documentation.",
            },
        )

    def test_semantic_query_retrieval(self):
        """Should retrieve relevant tools matching natural language requirements."""
        req = RAGQueryRequest(
            query="relational SQL database alternative with postgresql and authentication",
            min_health_score=50.0,
            top_k=5,
        )
        res = self.rag.query_recommendations(req)

        self.assertGreaterEqual(res.total_recommendations, 1)
        top_tool = res.recommendations[0]
        self.assertEqual(top_tool.full_name, "supabase/supabase")
        self.assertIn("OpenBridge Catalog Verified Entity", top_tool.source_citation)

    def test_no_hallucinations_enforced(self):
        """Every recommended tool must correspond to a verified entity in DB (Principio P6)."""
        req = RAGQueryRequest(
            query="high performance web backend",
            min_health_score=10.0,
            top_k=5,
        )
        res = self.rag.query_recommendations(req)

        for tool in res.recommendations:
            db_record = self.db.get_repository_by_id(tool.id)
            self.assertIsNotNone(db_record, f"Alucinación detectada: {tool.full_name} no existe en base de datos")
            self.assertEqual(db_record["full_name"], tool.full_name)


if __name__ == "__main__":
    unittest.main()

