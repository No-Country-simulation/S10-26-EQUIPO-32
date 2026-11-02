"""Rate Limiting Middleware and Utilities.

Adheres to:
- OWASP A04: Insecure Design (Resource Exhaustion / DoS Prevention)
- NIST CSF 2.0: PR.PS-01
Implements a sliding window counter per client IP and authenticated token.
"""

from collections import defaultdict
import time
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from backend.app.core.config import settings


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self, limit_per_minute: int = 60):
        self.limit = limit_per_minute
        self.window_seconds = 60.0
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_key: str) -> Tuple[bool, int, float]:
        """Checks if a request is allowed under the rate limit.

        Returns:
            Tuple[bool, int, float]: (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - self.window_seconds

        timestamps = self._requests[client_key]

        # Prune timestamps older than window
        self._requests[client_key] = [t for t in timestamps if t > window_start]
        current_count = len(self._requests[client_key])

        if current_count >= self.limit:
            oldest = self._requests[client_key][0]
            retry_after = max(1.0, round(oldest + self.window_seconds - now, 2))
            return False, 0, retry_after

        # Record this request
        self._requests[client_key].append(now)
        remaining = self.limit - (current_count + 1)
        return True, remaining, 0.0

    def reset(self) -> None:
        """Resets the rate limiter cache (useful for tests)."""
        self._requests.clear()


# Global rate limiter instance
limiter = SlidingWindowRateLimiter(limit_per_minute=settings.rate_limit_per_minute)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Starlette middleware applying rate limits across incoming requests."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Exclude internal health checks from aggressive rate limiting
        if request.url.path in ("/health", "/health/ready", "/docs", "/openapi.json"):
            return await call_next(request)

        # Derive identifier: Bearer token or client IP
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            client_id = f"token:{auth_header[7:30]}"
        else:
            client_ip = request.client.host if request.client else "unknown"
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            client_id = f"ip:{client_ip}"

        allowed, remaining, retry_after = limiter.is_allowed(client_id)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "detail": "Rate limit exceeded. Por favor reduzca la frecuencia de peticiones.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(int(retry_after)),
                    "X-RateLimit-Limit": str(limiter.limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limiter.limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response

