"""Audit Trail Query API Endpoints.

Adheres to:
- NIST CSF 2.0: DE.AE, DE.CM
- Requires UserRole.ADMIN
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from backend.app.api.dependencies import require_role
from backend.app.core.audit import audit_logger
from backend.app.core.security import UserRole
from backend.app.schemas.audit import AuditListResponse, AuditLogResponse


router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get(
    "/logs",
    response_model=AuditListResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200, description="Max logs to return"),
    action: Optional[str] = Query(None, description="Filter by action name"),
):
    """Retrieves recent security audit events. Requires Admin role."""
    events = audit_logger.get_recent_events(limit=limit, action_filter=action)
    return AuditListResponse(
        total=len(events),
        items=[AuditLogResponse(**e) for e in events],
    )

