"""FastAPI Security Dependencies and Role Enforcement.

Adheres to:
- OWASP A01: Broken Access Control
- Principle P3: Least privilege
"""

from typing import Callable, Optional
from fastapi import Header, HTTPException, Request, status
from backend.app.core.security import UserRole, authenticate_token, has_required_role


def get_current_role(authorization: Optional[str] = Header(None)) -> UserRole:
    """Extracts and verifies caller role from Authorization header."""
    return authenticate_token(authorization)


def require_role(required_role: UserRole) -> Callable:
    """Dependency factory enforcing minimum required role."""

    def role_checker(
        request: Request,
        role: UserRole = Header(default=None),
        authorization: Optional[str] = Header(None),
    ) -> UserRole:
        resolved_role = authenticate_token(authorization)
        if not has_required_role(resolved_role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Se requiere rol '{required_role.value}' o superior.",
            )
        return resolved_role

    return role_checker


def get_client_ip(request: Request) -> str:
    """Extracts client IP address respecting X-Forwarded-For headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

