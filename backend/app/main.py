"""OpenBridge Backend Main Application Entrypoint.

Adheres to:
- OWASP Top 10 Web (2021)
- OWASP Top 10 for LLM Applications (2025)
- NIST CSF 2.0 (PR.AA, PR.DS, PR.PS, DE.AE, DE.CM)
- OpenBridge Constitution (P1 to P10)
"""

from contextlib import asynccontextmanager
import logging
import uuid
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.api.router import api_router
from backend.app.api.routes.health import router as health_router
from backend.app.core.audit import audit_logger
from backend.app.core.config import settings
from backend.app.core.headers import SecurityHeadersMiddleware
from backend.app.core.rate_limiter import RateLimitMiddleware


logger = logging.getLogger("openbridge.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management and startup security assertions."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version} [{settings.backend_env}]")
    audit_logger.log(
        action="SERVER_STARTUP",
        actor="system",
        resource="backend_service",
        status="SUCCESS",
        details={
            "environment": settings.backend_env,
            "version": settings.app_version,
            "rate_limit_per_minute": settings.rate_limit_per_minute,
            "cors_origins": settings.allowed_origins,
        },
    )
    yield
    logger.info("Shutting down OpenBridge Backend...")
    audit_logger.log(
        action="SERVER_SHUTDOWN",
        actor="system",
        resource="backend_service",
        status="SUCCESS",
    )


# FastAPI Application instance
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "API y Pipeline de Ingesta para OpenBridge: Catálogo inteligente de herramientas "
        "open-source con métricas de salud deterministas y asistente RAG seguro (Principio P6)."
    ),
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)


# 1. Global Exception Handler (OWASP A05: Prevents Stack Trace Information Disclosure)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches all unhandled exceptions and returns an opaque error ID to the caller."""
    error_id = str(uuid.uuid4())
    logger.error(f"[ERROR_ID: {error_id}] Unhandled error at {request.method} {request.url.path}: {str(exc)}", exc_info=True)

    audit_logger.log(
        action="UNHANDLED_EXCEPTION",
        actor="system",
        resource=f"{request.method} {request.url.path}",
        status="FAILURE",
        ip_address=request.client.host if request.client else "unknown",
        details={"error_id": error_id, "error_type": exc.__class__.__name__},
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "Se ha producido un error inesperado al procesar la solicitud.",
            "error_id": error_id,
        },
    )


# 2. CORS Middleware (Strict Origin Policy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

# 3. Security Headers Middleware (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
app.add_middleware(SecurityHeadersMiddleware)

# 4. Sliding Window Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# 5. Route Inclusions
app.include_router(health_router)
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=not settings.is_production,
    )

