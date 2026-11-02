"""Retrieval-Augmented Generation (RAG) & Semantic Recommendation Service.

Adheres strictly to:
- Principle P6: The assistant does not invent (zero hallucination guarantee)
- Principle P7: Real, reproducible metrics
- OWASP LLM06 / LLM09: Mitigates misinformation and ungrounded generation
"""

from typing import Optional
from backend.app.database.client import db_client
from backend.app.schemas.rag import RAGQueryRequest, RAGQueryResponse, RecommendedTool
from backend.app.services.vector_service import vector_service


class RAGService:
    """Manages semantic search and stack recommendations with verified provenance."""

    def __init__(self, db=None, vs=None):
        self.db = db or db_client
        self.vs = vs or vector_service

    def query_recommendations(self, request: RAGQueryRequest) -> RAGQueryResponse:
        """Finds recommended tools matching the query with guaranteed source verification.

        Enforces:
        1. Query embedding generation.
        2. Vector similarity match against stored database embeddings.
        3. Strict filtering by minimum health score and category.
        4. Cross-verification that each returned tool exists in the database catalog.
        """
        # 1. Vectorize query
        query_vector = self.vs.generate_embedding(request.query)

        # 2. Vector search via pgvector match function
        raw_matches = self.db.match_repositories_vector(
            query_embedding=query_vector,
            match_threshold=0.10,  # inclusive threshold for dense retrieval
            match_count=request.top_k,
            filter_category=request.category,
        )

        recommended_tools = []

        for match in raw_matches:
            health_score = float(match.get("health_score", 0.0))

            # Apply health threshold filter
            if health_score < request.min_health_score:
                continue

            # Verify existence in DB to enforce Principle P6
            repo_record = self.db.get_repository_by_id(match["id"])
            if not repo_record:
                # Discard any hallucinated/unverified entity
                continue

            # Construct verified citation
            citation = f"OpenBridge Catalog Verified Entity: {repo_record['full_name']} (Health: {health_score}/100, URL: {repo_record['html_url']})"

            tool = RecommendedTool(
                id=repo_record["id"],
                full_name=repo_record["full_name"],
                description=repo_record.get("description") or "Sin descripción proporcionada.",
                html_url=repo_record["html_url"],
                category=repo_record.get("category", "Other"),
                health_score=health_score,
                similarity_score=float(match.get("similarity", 0.0)),
                source_citation=citation,
            )
            recommended_tools.append(tool)

        return RAGQueryResponse(
            query=request.query,
            total_recommendations=len(recommended_tools),
            recommendations=recommended_tools,
            verified_sources_count=len(recommended_tools),
        )


# Global RAG service instance
rag_service = RAGService()
