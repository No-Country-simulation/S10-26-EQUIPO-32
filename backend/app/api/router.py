"""Aggregated API v1 Router."""

from fastapi import APIRouter
from backend.app.api.routes import audit, health, ingestion, rag, repositories


api_router = APIRouter(prefix="/api/v1")

# Mount subrouters
api_router.include_router(repositories.router)
api_router.include_router(ingestion.router)
api_router.include_router(rag.router)
api_router.include_router(audit.router)

