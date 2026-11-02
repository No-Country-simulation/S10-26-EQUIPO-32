"""Repositories Catalog Endpoints."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.database.client import db_client
from backend.app.schemas.repository import RepositoryListResponse, RepositoryResponse


router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.get("", response_model=RepositoryListResponse)
def list_repositories(
    category: Optional[str] = Query(None, description="Filter by category"),
    license_spdx: Optional[str] = Query(None, description="Filter by SPDX license"),
    min_health_score: float = Query(0.0, ge=0.0, le=100.0, description="Minimum health score filter"),
    search: Optional[str] = Query(None, max_length=100, description="Search by name or description"),
    limit: int = Query(20, ge=1, le=100, description="Pagination page size"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Retrieves paginated catalog of open-source repositories."""
    safe_category = category if isinstance(category, str) else None
    safe_license = license_spdx if isinstance(license_spdx, str) else None
    safe_search = search if isinstance(search, str) else None
    safe_min_health = float(min_health_score) if isinstance(min_health_score, (int, float)) else 0.0
    safe_limit = int(limit) if isinstance(limit, int) else 20
    safe_offset = int(offset) if isinstance(offset, int) else 0

    items, total = db_client.list_repositories(
        category=safe_category,
        license_spdx=safe_license,
        min_health_score=safe_min_health,
        search_query=safe_search,
        limit=safe_limit,
        offset=safe_offset,
    )
    return RepositoryListResponse(
        total=total,
        limit=safe_limit,
        offset=safe_offset,
        items=[RepositoryResponse(**item) for item in items],
    )


@router.get("/{id_or_slug:path}")
def get_repository(id_or_slug: str):
    """Retrieves a single repository and its health breakdown metrics by UUID or 'owner/repo' slug."""
    clean_identifier = id_or_slug.strip()

    repo = None
    if "/" in clean_identifier:
        repo = db_client.get_repository_by_slug(clean_identifier)
    else:
        repo = db_client.get_repository_by_id(clean_identifier)

    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Herramienta o repositorio no encontrado: '{clean_identifier}'",
        )

    metrics = db_client.get_metrics_by_repo_id(repo["id"])

    return {
        "repository": RepositoryResponse(**repo),
        "health_breakdown": metrics,
    }
