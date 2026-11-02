"""Pydantic schemas for repository ingestion endpoints."""

from typing import List, Optional
from pydantic import BaseModel, Field


class IngestRepoRequest(BaseModel):
    """Payload to ingest a single GitHub repository."""

    repo_url_or_slug: str = Field(
        ...,
        description="Full URL (https://github.com/owner/repo) or slug (owner/repo)",
        examples=["https://github.com/supabase/supabase", "facebook/react"],
    )
    category: Optional[str] = Field(default="Developer Tools", description="Classification category")


class IngestBatchRequest(BaseModel):
    """Payload to ingest multiple GitHub repositories."""

    repositories: List[IngestRepoRequest] = Field(..., max_length=20)


class IngestionResponse(BaseModel):
    """Result of repository ingestion."""

    success: bool
    full_name: str
    message: str
    repository_id: Optional[str] = None
    health_score: Optional[float] = None
    embedding_generated: bool = False

