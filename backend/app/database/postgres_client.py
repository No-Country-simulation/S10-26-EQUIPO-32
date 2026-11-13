"""Postgres (+ pgvector) implementation of the OpenBridge data layer (feature 006; RF-27, RNF-34, RNF-35).

Same public interface as the in-memory ``DatabaseClient`` in ``client.py``. Only the data layer changes: health
score, sanitizer and routes are untouched. Every query is parameterized (psycopg2 placeholders, never string
formatting of values); the only dynamic SQL is the *structure* of WHERE clauses, built from fixed fragments.

Least privilege (P3): the backend connects with a login role that is a member of ``service_role`` and every
session runs as ``service_role`` (``-c role=service_role``), so the RLS policies of schema.sql apply. The
database password comes only from ``DATABASE_URL`` (environment); it is never logged or put in ``repr``.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
import json
import threading
from typing import Any, Dict, Iterator, List, Optional, Tuple
import uuid

import psycopg2
import psycopg2.extras
from psycopg2 import pool

SERVICE_ROLE = "service_role"
_REPO_COLUMNS = (
    "github_id", "owner", "name", "full_name", "description", "html_url", "category", "language", "license_spdx",
    "stars_count", "forks_count", "open_issues_count", "is_archived", "health_score",
)
_METRIC_COLUMNS = (
    "commit_frequency_score", "issue_resolution_score", "license_score", "community_score", "documentation_score",
)
_REPO_SELECT = "id, " + ", ".join(_REPO_COLUMNS) + ", created_at, updated_at"


def _escape_like(text: str) -> str:
    """Escapes LIKE wildcards of untrusted input so a search for '%' or '_' is literal."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _clean(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Normalizes a row to the JSON-friendly shapes the in-memory store returns."""
    if row is None:
        return None
    out: Dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, uuid.UUID):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif hasattr(value, "quantize"):  # Decimal from NUMERIC
            out[key] = float(value)
        else:
            out[key] = value
    return out


def _vector_literal(embedding: List[float]) -> str:
    return "[" + ",".join(repr(float(x)) for x in embedding) + "]"


class PostgresDatabaseClient:
    """Thread-safe Postgres store with a small connection pool."""

    def __init__(self, database_url: str, allow_clear: bool = False, minconn: int = 1, maxconn: int = 5):
        if not database_url:
            raise ValueError("DATABASE_URL is required for PostgresDatabaseClient.")
        self._allow_clear = allow_clear
        self._lock = threading.Lock()
        self._pool = pool.ThreadedConnectionPool(
            minconn, maxconn, dsn=database_url, options=f"-c role={SERVICE_ROLE}", connect_timeout=5
        )

    def __repr__(self) -> str:  # never leak the DSN
        return "<PostgresDatabaseClient pool=configured>"

    @property
    def is_mock(self) -> bool:
        return False

    def close(self) -> None:
        self._pool.closeall()

    @contextmanager
    def _cursor(self) -> Iterator[psycopg2.extras.RealDictCursor]:
        conn = self._pool.getconn()
        try:
            with conn:  # commit or rollback
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    yield cur
        finally:
            self._pool.putconn(conn)

    def ping(self) -> bool:
        with self._cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            return cur.fetchone()["ok"] == 1

    # ------------------------------------------------------------------ writes

    def save_repository(self, repo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts or updates a repository (upsert by full_name)."""
        values = {c: repo_data.get(c) for c in _REPO_COLUMNS if repo_data.get(c) is not None}
        for required in ("owner", "name", "full_name", "html_url"):
            if not values.get(required):
                raise ValueError(f"Missing required repository field: {required}")
        columns = list(values)
        updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in columns if c != "full_name")
        sql = (
            f"INSERT INTO public.repositories ({', '.join(columns)}) VALUES ({', '.join(['%s'] * len(columns))}) "
            f"ON CONFLICT (full_name) DO UPDATE SET {updates}, updated_at = NOW() RETURNING {_REPO_SELECT}"
        )
        with self._cursor() as cur:
            cur.execute(sql, [values[c] for c in columns])
            return _clean(cur.fetchone())  # type: ignore[return-value]

    def save_metrics(self, repo_id: str, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        scores = [float(metrics_data.get(c, 0.0)) for c in _METRIC_COLUMNS]
        sql = (
            f"INSERT INTO public.repository_metrics (repository_id, {', '.join(_METRIC_COLUMNS)}) "
            f"VALUES (%s, {', '.join(['%s'] * len(_METRIC_COLUMNS))}) "
            f"ON CONFLICT (repository_id) DO UPDATE SET "
            f"{', '.join(f'{c} = EXCLUDED.{c}' for c in _METRIC_COLUMNS)}, calculated_at = NOW() RETURNING id"
        )
        with self._cursor() as cur:
            cur.execute(sql, [repo_id, *scores])
        return self.get_metrics_by_repo_id(repo_id) or {}

    def save_embedding(self, repo_id: str, embedding: List[float], content_chunk: str) -> Dict[str, Any]:
        sql = (
            "INSERT INTO public.repository_embeddings (repository_id, embedding, content_chunk) "
            "VALUES (%s, %s::vector, %s) ON CONFLICT (repository_id) DO UPDATE SET "
            "embedding = EXCLUDED.embedding, content_chunk = EXCLUDED.content_chunk, updated_at = NOW() "
            "RETURNING id, repository_id, content_chunk, updated_at"
        )
        with self._cursor() as cur:
            cur.execute(sql, [repo_id, _vector_literal(embedding), content_chunk])
            record = _clean(cur.fetchone()) or {}
        record["embedding"] = embedding
        return record

    # ------------------------------------------------------------------- reads

    @staticmethod
    def _valid_uuid(value: str) -> bool:
        try:
            uuid.UUID(str(value))
            return True
        except ValueError:
            return False

    def get_repository_by_id(self, repo_id: str) -> Optional[Dict[str, Any]]:
        if not self._valid_uuid(repo_id):
            return None
        with self._cursor() as cur:
            cur.execute(f"SELECT {_REPO_SELECT} FROM public.repositories WHERE id = %s", [repo_id])
            return _clean(cur.fetchone())

    def get_repository_by_slug(self, full_name: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(f"SELECT {_REPO_SELECT} FROM public.repositories WHERE full_name = %s", [full_name])
            return _clean(cur.fetchone())

    def get_metrics_by_repo_id(self, repo_id: str) -> Optional[Dict[str, Any]]:
        if not self._valid_uuid(repo_id):
            return None
        # total_score and penalty_archived are not columns: they come from the repository row (single source).
        sql = (
            "SELECT m.id, m.repository_id, m.commit_frequency_score, m.issue_resolution_score, m.license_score, "
            "m.community_score, m.documentation_score, m.calculated_at, r.health_score AS total_score, "
            "r.is_archived AS penalty_archived FROM public.repository_metrics m "
            "JOIN public.repositories r ON r.id = m.repository_id WHERE m.repository_id = %s"
        )
        with self._cursor() as cur:
            cur.execute(sql, [repo_id])
            return _clean(cur.fetchone())

    def list_repositories(
        self,
        category: Optional[str] = None,
        license_spdx: Optional[str] = None,
        min_health_score: float = 0.0,
        search_query: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = min(max(1, limit), 100)
        offset = max(0, offset)
        where: List[str] = []
        params: List[Any] = []
        if category:
            where.append("lower(category) = lower(%s)")
            params.append(category)
        if license_spdx:
            where.append("lower(license_spdx) = lower(%s)")
            params.append(license_spdx)
        if min_health_score > 0:
            where.append("health_score >= %s")
            params.append(min_health_score)
        if search_query:
            like = f"%{_escape_like(search_query)}%"
            where.append("(full_name ILIKE %s ESCAPE '\\' OR COALESCE(description, '') ILIKE %s ESCAPE '\\')")
            params.extend([like, like])
        clause = f" WHERE {' AND '.join(where)}" if where else ""
        with self._cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS n FROM public.repositories{clause}", params)
            total = int(cur.fetchone()["n"])
            cur.execute(
                f"SELECT {_REPO_SELECT} FROM public.repositories{clause} "
                "ORDER BY health_score DESC, stars_count DESC, full_name ASC LIMIT %s OFFSET %s",
                [*params, limit, offset],
            )
            return [_clean(r) for r in cur.fetchall()], total  # type: ignore[misc]

    def list_all_repositories(self) -> List[Dict[str, Any]]:
        """Every catalog row (for the scheduled re-ingestion)."""
        with self._cursor() as cur:
            cur.execute(f"SELECT {_REPO_SELECT} FROM public.repositories ORDER BY full_name")
            return [_clean(r) for r in cur.fetchall()]  # type: ignore[misc]

    def match_repositories_vector(
        self,
        query_embedding: List[float],
        match_threshold: float = 0.50,
        match_count: int = 5,
        filter_category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Cosine search over stored embeddings: only real catalog rows can come back (P6)."""
        match_count = min(max(1, match_count), 50)
        sql = (
            "SELECT r.id, r.full_name, r.description, r.html_url, r.category, r.health_score, "
            "1 - (re.embedding <=> %s::vector) AS similarity "
            "FROM public.repository_embeddings re JOIN public.repositories r ON r.id = re.repository_id "
            "WHERE 1 - (re.embedding <=> %s::vector) >= %s AND (%s::text IS NULL OR lower(r.category) = lower(%s)) "
            "ORDER BY similarity DESC, r.health_score DESC LIMIT %s"
        )
        vec = _vector_literal(query_embedding)
        with self._cursor() as cur:
            cur.execute(sql, [vec, vec, match_threshold, filter_category, filter_category, match_count])
            rows = [_clean(r) for r in cur.fetchall()]
        for row in rows:  # type: ignore[union-attr]
            row["similarity"] = round(float(row["similarity"]), 4)  # type: ignore[index]
            row["description"] = row.get("description") or ""  # type: ignore[union-attr]
        return rows  # type: ignore[return-value]

    # ------------------------------------------------------------------- audit

    def log_audit(self, event_data: Dict[str, Any]) -> None:
        sql = (
            "INSERT INTO public.audit_logs (actor, role, action, resource, status, ip_address, details) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)"
        )
        with self._cursor() as cur:
            cur.execute(sql, [
                str(event_data.get("actor", "system")), str(event_data.get("role", "system")),
                str(event_data.get("action", "UNKNOWN")), str(event_data.get("resource", "")),
                str(event_data.get("status", "")), event_data.get("ip_address"),
                json.dumps(event_data.get("details") or {}, default=str),
            ])

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM public.audit_logs ORDER BY timestamp DESC LIMIT %s", [min(max(1, limit), 200)])
            return [_clean(r) for r in cur.fetchall()]  # type: ignore[misc]

    def clear(self) -> None:
        """Wipes the catalog. Only for isolated test databases (``allow_clear=True``); never on a real one."""
        if not self._allow_clear:
            raise PermissionError("clear() is disabled on the Postgres store unless allow_clear=True (tests only).")
        with self._cursor() as cur:
            cur.execute(
                "TRUNCATE public.repository_embeddings, public.repository_metrics, public.repositories, "
                "public.audit_logs CASCADE"
            )
