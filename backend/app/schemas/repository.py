"""Pydantic schemas for Repositories and Catalog items."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RepositoryBase(BaseModel):
    full_name: str = Field(..., description="Format: owner/repo")
    owner: str
    name: str
    description: Optional[str] = None
    html_url: str
    category: str = Field(default="Other")
    language: Optional[str] = None
    license_spdx: Optional[str] = "NOASSERTION"
    stars_count: int = 0
    forks_count: int = 0
    open_issues_count: int = 0
    is_archived: bool = False
    health_score: float = Field(default=0.0, ge=0.0, le=100.0)


class RepositoryCreate(RepositoryBase):
    github_id: Optional[int] = None


class RepositoryResponse(RepositoryBase):
    id: str
    github_id: Optional[int] = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class RepositoryListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[RepositoryResponse]

