"""Repository Ingestion Pipeline Orchestrator.

Adheres to:
- Principle P1: Spec first
- Principle P2: Security by design (Defense in depth)
- Principle P3: Least privilege (service_role only)
- Principle P5: Untrusted external data handling
- Principle P7: Real, reproducible metrics
"""

from typing import Any, Dict, Optional
from backend.app.core.audit import audit_logger
from backend.app.core.sanitizer import validate_github_url
from backend.app.database.client import db_client
from backend.app.schemas.ingestion import IngestionResponse
from backend.app.services.github_service import github_service
from backend.app.services.health_score_service import health_score_service
from backend.app.services.vector_service import vector_service


class IngestionPipeline:
    """Orchestrates end-to-end repository ingestion into the OpenBridge catalog."""

    def __init__(self, db=None, gh=None, hs=None, vs=None):
        self.db = db or db_client
        self.gh = gh or github_service
        self.hs = hs or health_score_service
        self.vs = vs or vector_service

    def ingest_repository(
        self,
        url_or_slug: str,
        category: str = "Developer Tools",
        actor: str = "system",
        ip_address: Optional[str] = None,
        preloaded_data: Optional[Dict[str, Any]] = None,
    ) -> IngestionResponse:
        """Executes full ingestion pipeline for a single repository."""
        # 1. Anti-SSRF URL validation & extraction
        try:
            owner, repo = validate_github_url(url_or_slug)
            full_name = f"{owner}/{repo}"
        except Exception as e:
            audit_logger.log(
                action="INGEST_VALIDATION_ERROR",
                actor=actor,
                resource=url_or_slug,
                status="DENIED",
                ip_address=ip_address,
                details={"error": str(e)},
            )
            raise ValueError(f"Validación de URL rechazada (Anti-SSRF): {str(e)}")

        # 2. Fetch data from GitHub API (or use preloaded for testing)
        try:
            if preloaded_data:
                repo_data = preloaded_data
            else:
                repo_data = self.gh.fetch_repository_data(url_or_slug)

            repo_data["category"] = category
        except Exception as e:
            audit_logger.log(
                action="INGEST_GITHUB_FETCH_ERROR",
                actor=actor,
                resource=full_name,
                status="FAILURE",
                ip_address=ip_address,
                details={"error": str(e)},
            )
            raise

        # 3. Calculate Deterministic Health Score
        breakdown = self.hs.calculate_health_score(repo_data)
        repo_data["health_score"] = breakdown.total_score

        # 4. Generate Vector Embedding
        content_chunk = self.vs.build_repository_chunk(repo_data)
        embedding = self.vs.generate_embedding(content_chunk)

        # 5. Persist into Database
        saved_repo = self.db.save_repository(repo_data)
        repo_id = saved_repo["id"]

        # Persist metrics breakdown
        self.db.save_metrics(repo_id, breakdown.model_dump())

        # Persist vector embedding
        self.db.save_embedding(repo_id, embedding, content_chunk)

        # 6. Audit Trail Logging (NIST CSF DE.AE)
        audit_logger.log(
            action="INGEST_REPOSITORY_SUCCESS",
            actor=actor,
            resource=full_name,
            status="SUCCESS",
            ip_address=ip_address,
            details={
                "repository_id": repo_id,
                "health_score": breakdown.total_score,
                "stars": repo_data.get("stars_count", 0),
                "license": repo_data.get("license_spdx", "None"),
            },
        )

        return IngestionResponse(
            success=True,
            full_name=full_name,
            message="Repositorio ingestado, auditado y vectorizado exitosamente.",
            repository_id=repo_id,
            health_score=breakdown.total_score,
            embedding_generated=True,
        )


# Global ingestion pipeline instance
ingestion_pipeline = IngestionPipeline()

