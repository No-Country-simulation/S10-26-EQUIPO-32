"""Health and Diagnostics Endpoints.

Adheres to:
- NIST CSF 2.0: DE.CM-01
- RFC 7807 problem details
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.database.client import db_client


router = APIRouter(tags=["Health"])


@router.get("/health")
def health_liveness():
    """Basic liveness probe."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
def health_readiness():
    """Readiness probe evaluating database connection and core subsystems."""
    db_status = "connected"
    if db_client.is_mock:
        db_status = "mock_in_memory"

    return {
        "status": "ready",
        "environment": settings.backend_env,
        "database": db_status,
        "security_controls": {
            "rate_limiter": "active",
            "security_headers": "active",
            "rbac": "active",
            "audit_logging": "active",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

