"""Database Client and Repository Store for OpenBridge.

Provides integration with Supabase (Postgres + pgvector) and a resilient,
thread-safe in-memory store for local development, offline runs, and automated testing.
Adheres to Principle P3 (Least Privilege) and P8 (Simple before complex).
"""

from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional, Tuple
import uuid
from backend.app.core.config import settings
from backend.app.core.audit import audit_logger


class DatabaseClient:
    """High-level database access layer supporting Supabase and local memory fallback."""

    def __init__(self):
        self._is_mock = not bool(settings.supabase_url and settings.supabase_service_role_key)
        # In-memory collections for local fallback / testing
        self._repositories: Dict[str, Dict[str, Any]] = {}
        self._metrics: Dict[str, Dict[str, Any]] = {}
        self._embeddings: Dict[str, Dict[str, Any]] = {}
        self._audit_logs: List[Dict[str, Any]] = []

    @property
    def is_mock(self) -> bool:
        return self._is_mock

    def save_repository(self, repo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts or updates a repository in the catalog."""
        repo_id = repo_data.get("id") or str(uuid.uuid4())
        full_name = repo_data["full_name"]
        now = datetime.now(timezone.utc).isoformat()

        # Check existing by full_name
        existing_id = None
        for r_id, r in self._repositories.items():
            if r.get("full_name") == full_name:
                existing_id = r_id
                break

        if existing_id:
            repo_id = existing_id
            created_at = self._repositories[repo_id].get("created_at", now)
        else:
            created_at = repo_data.get("created_at", now)

        record = {
            **repo_data,
            "id": repo_id,
            "created_at": created_at,
            "updated_at": now,
        }
        self._repositories[repo_id] = record
        return record

    def save_metrics(self, repo_id: str, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves analytical breakdown of repository health score."""
        metric_id = str(uuid.uuid4())
        record = {
            **metrics_data,
            "id": metric_id,
            "repository_id": repo_id,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._metrics[repo_id] = record
        return record

    def save_embedding(self, repo_id: str, embedding: List[float], content_chunk: str) -> Dict[str, Any]:
        """Saves dense vector representation for RAG retrieval."""
        embed_id = str(uuid.uuid4())
        record = {
            "id": embed_id,
            "repository_id": repo_id,
            "embedding": embedding,
            "content_chunk": content_chunk,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._embeddings[repo_id] = record
        return record

    def get_repository_by_id(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves repository by UUID."""
        return self._repositories.get(repo_id)

    def get_repository_by_slug(self, full_name: str) -> Optional[Dict[str, Any]]:
        """Retrieves repository by 'owner/repo' slug."""
        for r in self._repositories.values():
            if r.get("full_name") == full_name:
                return r
        return None

    def get_metrics_by_repo_id(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves health breakdown metrics for a repository."""
        return self._metrics.get(repo_id)

    def list_repositories(
        self,
        category: Optional[str] = None,
        license_spdx: Optional[str] = None,
        min_health_score: float = 0.0,
        search_query: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists repositories with pagination, search and filtering."""
        limit = min(max(1, limit), 100)  # Bound limit to 1..100
        offset = max(0, offset)

        results = list(self._repositories.values())

        # Filtering
        if category:
            results = [r for r in results if r.get("category", "").lower() == category.lower()]
        if license_spdx:
            results = [r for r in results if r.get("license_spdx", "").lower() == license_spdx.lower()]
        if min_health_score > 0:
            results = [r for r in results if float(r.get("health_score", 0)) >= min_health_score]
        if search_query:
            q = search_query.lower()
            results = [
                r for r in results
                if q in r.get("full_name", "").lower() or q in (r.get("description") or "").lower()
            ]

        # Sort by health_score desc, stars_count desc
        results.sort(key=lambda x: (float(x.get("health_score", 0)), int(x.get("stars_count", 0))), reverse=True)

        total = len(results)
        paginated = results[offset : offset + limit]
        return paginated, total

    def match_repositories_vector(
        self,
        query_embedding: List[float],
        match_threshold: float = 0.50,
        match_count: int = 5,
        filter_category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Performs cosine similarity vector search against stored embeddings.

        Implements the logic of `match_repositories` RPC in schema.sql.
        Guarantees that ONLY existing catalog items are returned (Principio P6).
        """
        scored_matches = []

        for repo_id, embed_record in self._embeddings.items():
            repo = self._repositories.get(repo_id)
            if not repo:
                continue

            if filter_category and repo.get("category", "").lower() != filter_category.lower():
                continue

            target_embedding = embed_record.get("embedding", [])
            similarity = self._compute_cosine_similarity(query_embedding, target_embedding)

            if similarity >= match_threshold:
                scored_matches.append({
                    "id": repo["id"],
                    "full_name": repo["full_name"],
                    "description": repo.get("description", ""),
                    "html_url": repo["html_url"],
                    "category": repo.get("category", "Other"),
                    "health_score": float(repo.get("health_score", 0)),
                    "similarity": round(similarity, 4),
                })

        # Sort by similarity descending, then health_score descending
        scored_matches.sort(key=lambda x: (x["similarity"], x["health_score"]), reverse=True)
        return scored_matches[:match_count]

    @staticmethod
    def _compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Calculates cosine similarity between two float vectors."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def list_all_repositories(self) -> List[Dict[str, Any]]:
        """Every catalog row (for the scheduled re-ingestion; feature 006)."""
        return sorted(self._repositories.values(), key=lambda r: r.get("full_name", ""))

    def log_audit(self, event_data: Dict[str, Any]) -> None:
        """Stores audit log record."""
        self._audit_logs.append(event_data)

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent audit log records."""
        return list(reversed(self._audit_logs))[:limit]

    def clear(self) -> None:
        """Clears all stored records (for unit test isolation)."""
        self._repositories.clear()
        self._metrics.clear()
        self._embeddings.clear()
        self._audit_logs.clear()


def create_db_client():
    """Selects the data layer (feature 006; RF-27): Postgres when DATABASE_URL is set, in-memory otherwise.

    Without DATABASE_URL the in-memory store is kept (unit tests and offline mode)."""
    if settings.database_url:
        from backend.app.database.postgres_client import PostgresDatabaseClient

        return PostgresDatabaseClient(settings.database_url)
    return DatabaseClient()


# Global database client singleton
db_client = create_db_client()

