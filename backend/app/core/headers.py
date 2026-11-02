"""HTTP Security Headers Middleware.

Adheres to:
- OWASP A05: Security Misconfiguration
- NIST CSF 2.0: PR.DS-01
Enforces HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
and removes server identification headers.
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces strict defense-in-depth HTTP response headers."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Content-Security-Policy (Restricts execution to self and denies framing)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https://github.com https://avatars.githubusercontent.com; "
            "frame-ancestors 'none'; "
            "object-src 'none';"
        )

        # Anti-MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Anti-Clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # HTTP Strict Transport Security (HSTS - 2 years)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # Remove information disclosure headers
        if "server" in response.headers:
            del response.headers["server"]
        if "x-powered-by" in response.headers:
            del response.headers["x-powered-by"]

        return response

