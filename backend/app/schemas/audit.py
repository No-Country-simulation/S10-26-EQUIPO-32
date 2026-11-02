"""Pydantic schemas for audit log querying."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    action: str
    actor: str
    role: str
    resource: str
    status: str
    ip_address: Optional[str] = None
    details: Dict[str, Any] = {}


class AuditListResponse(BaseModel):
    total: int
    items: List[AuditLogResponse]

