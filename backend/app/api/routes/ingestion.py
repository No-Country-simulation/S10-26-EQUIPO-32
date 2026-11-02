"""Repository Ingestion Protected API Endpoints.

Adheres to:
- Principle P3: Least privilege (Requires UserRole.SERVICE_ROLE or higher)
- OWASP A01: Broken Access Control
- OWASP A10: Anti-SSRF
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.app.api.dependencies import get_client_ip, require_role
from backend.app.core.security import UserRole
from backend.app.schemas.ingestion import IngestBatchRequest, IngestRepoRequest, IngestionResponse
from backend.app.services.ingestion_pipeline import ingestion_pipeline


router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


@router.post(
    "/repository",
    response_model=IngestionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.SERVICE_ROLE))],
)
def ingest_single_repository(
    payload: IngestRepoRequest,
    request: Request,
):
    """Ingests a single GitHub repository. Requires service_role or admin role."""
    client_ip = get_client_ip(request)
    try:
        result = ingestion_pipeline.ingest_repository(
            url_or_slug=payload.repo_url_or_slug,
            category=payload.category or "Developer Tools",
            actor="api_client",
            ip_address=client_ip,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Fallo en ingesta: {str(e)}")


@router.post(
    "/batch",
    response_model=List[IngestionResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.SERVICE_ROLE))],
)
def ingest_batch_repositories(
    payload: IngestBatchRequest,
    request: Request,
):
    """Batch ingests up to 20 repositories. Requires service_role or admin role."""
    client_ip = get_client_ip(request)
    results = []

    for item in payload.repositories:
        try:
            res = ingestion_pipeline.ingest_repository(
                url_or_slug=item.repo_url_or_slug,
                category=item.category or "Developer Tools",
                actor="batch_client",
                ip_address=client_ip,
            )
            results.append(res)
        except Exception as e:
            results.append(
                IngestionResponse(
                    success=False,
                    full_name=item.repo_url_or_slug,
                    message=f"Error: {str(e)}",
                    embedding_generated=False,
                )
            )

    return results

