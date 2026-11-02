"""Security, Authentication and Role-Based Access Control (RBAC) Module.

Adheres to:
- OWASP A01: Broken Access Control
- OWASP A02: Cryptographic Failures
- OWASP A07: Identification and Authentication Failures
- NIST CSF 2.0: PR.AA-01, PR.AA-02
"""

from enum import Enum
import hmac
from typing import Optional
from backend.app.core.config import settings


class UserRole(str, Enum):
    """User roles defining granular system access levels."""
    ANONYMOUS = "anonymous"
    READONLY = "readonly"
    SERVICE_ROLE = "service_role"
    ADMIN = "admin"


# Role hierarchy weights
ROLE_HIERARCHY = {
    UserRole.ANONYMOUS: 0,
    UserRole.READONLY: 10,
    UserRole.SERVICE_ROLE: 50,
    UserRole.ADMIN: 100,
}


def verify_token_constant_time(provided: Optional[str], expected: str) -> bool:
    """Compares two tokens using constant-time comparison to prevent timing attacks."""
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided.strip().encode("utf-8"), expected.strip().encode("utf-8"))


def authenticate_token(token: Optional[str]) -> UserRole:
    """Authenticates an API Key / Bearer token and resolves the corresponding UserRole.

    Priority:
    1. Admin Key -> UserRole.ADMIN
    2. Supabase Service Role Key -> UserRole.SERVICE_ROLE
    3. Supabase Anon Key -> UserRole.READONLY
    4. Otherwise -> UserRole.ANONYMOUS
    """
    if not token:
        return UserRole.ANONYMOUS

    clean_token = token.strip()
    if clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()

    # Check Admin Key
    if settings.admin_api_key and verify_token_constant_time(clean_token, settings.admin_api_key):
        return UserRole.ADMIN

    # Check Supabase Service Role Key
    if settings.supabase_service_role_key and verify_token_constant_time(clean_token, settings.supabase_service_role_key):
        return UserRole.SERVICE_ROLE

    # Check Supabase Anon Key
    if settings.supabase_anon_key and verify_token_constant_time(clean_token, settings.supabase_anon_key):
        return UserRole.READONLY

    return UserRole.ANONYMOUS


def has_required_role(current_role: UserRole, required_role: UserRole) -> bool:
    """Checks if current role meets or exceeds required role hierarchy."""
    return ROLE_HIERARCHY.get(current_role, 0) >= ROLE_HIERARCHY.get(required_role, 0)

