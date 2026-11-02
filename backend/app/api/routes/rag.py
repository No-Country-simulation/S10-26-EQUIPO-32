"""RAG Retrieval and Semantic Recommendation API Endpoints.

Adheres to:
- Principle P6: The assistant does not invent (zero hallucination guarantee)
"""

from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.rag import RAGQueryRequest, RAGQueryResponse
from backend.app.services.rag_service import rag_service


router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/search", response_model=RAGQueryResponse)
def search_recommendations(request: RAGQueryRequest):
    """Performs semantic search against verified catalog tools.

    Guarantees that 100% of returned tools exist in the OpenBridge catalog.
    """
    try:
        response = rag_service.query_recommendations(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar consulta RAG: {str(e)}",
        )

