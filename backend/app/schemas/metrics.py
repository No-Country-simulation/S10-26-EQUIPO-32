"""Pydantic schemas for Health Score breakdown metrics."""

from typing import Optional
from pydantic import BaseModel, Field


class HealthScoreBreakdown(BaseModel):
    """Detailed breakdown of deterministic Health Score (0-100 pts)."""

    commit_frequency_score: float = Field(..., ge=0.0, le=25.0, description="Recent commit activity (max 25 pts)")
    issue_resolution_score: float = Field(..., ge=0.0, le=20.0, description="Issue responsiveness (max 20 pts)")
    license_score: float = Field(..., ge=0.0, le=20.0, description="OSI open-source license (max 20 pts)")
    community_score: float = Field(..., ge=0.0, le=20.0, description="Community engagement (max 20 pts)")
    documentation_score: float = Field(..., ge=0.0, le=15.0, description="README and docs presence (max 15 pts)")
    total_score: float = Field(..., ge=0.0, le=100.0, description="Total aggregated health score")
    penalty_archived: bool = Field(default=False, description="Whether penalty was applied for archived status")


class MetricsResponse(HealthScoreBreakdown):
    id: str
    repository_id: str
    calculated_at: str

