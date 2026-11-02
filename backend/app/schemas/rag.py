"""Pydantic schemas for RAG retrieval and stack recommendations."""

from typing import List, Optional
from pydantic import BaseModel, Field


class RAGQueryRequest(BaseModel):
    """Natural language query for intelligent stack recommendation."""

    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Business or technical requirement query (e.g. 'vector database with python client')",
        examples=["Fast API backend with authentication and postgresql support"],
    )
    category: Optional[str] = Field(default=None, description="Optional category filter")
    min_health_score: float = Field(default=40.0, ge=0.0, le=100.0, description="Minimum acceptable health score")
    top_k: int = Field(default=5, ge=1, le=10, description="Number of recommendations to return")


class RecommendedTool(BaseModel):
    """Represents a validated tool retrieved from the OpenBridge vector catalog."""

    id: str
    full_name: str
    description: str
    html_url: str
    category: str
    health_score: float
    similarity_score: float
    source_citation: str = Field(..., description="Verifiable proof of existing source (Principio P6)")


class RAGQueryResponse(BaseModel):
    """Structured response for RAG recommendation with verified sources."""

    query: str
    total_recommendations: int
    recommendations: List[RecommendedTool]
    verified_sources_count: int
    system_notice: str = Field(
        default="Todas las herramientas recomendadas existen y han sido verificadas en el catálogo de OpenBridge."
    )

