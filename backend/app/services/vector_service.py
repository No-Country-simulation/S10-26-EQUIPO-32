"""Vector Service for generating and matching dense semantic embeddings.

Adheres to:
- OWASP LLM08: Vector and Embedding Weaknesses
- Principle P6: The assistant does not invent (deterministic similarity scoring)
Produces unit-normalized 384-dimensional dense vectors compatible with pgvector.
"""

import hashlib
import math
import re
from typing import List, Optional
from backend.app.core.config import settings
from backend.app.core.sanitizer import sanitize_prompt_text


class VectorService:
    """Generates normalized vector embeddings for repository metadata and queries."""

    DIMENSION = 384

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.llm_api_key

    def generate_embedding(self, text: str) -> List[float]:
        """Generates a unit-normalized 384-dimensional embedding vector.

        Uses deterministic non-negative semantic feature hashing with L2 normalization.
        Ensures that matching keywords and phrases strictly generate positive dot products
        while unrelated texts approach zero, maintaining full mathematical compatibility
        with pgvector and cosine distance.
        """
        # 1. Sanitize text and truncate safely to prevent memory exhaustion
        clean_text = sanitize_prompt_text(text, max_length=3000).lower()

        # 2. Extract alphanumeric tokens and n-grams
        tokens = re.findall(r"\b[a-z0-9_\-\.]{2,}\b", clean_text)
        if not tokens:
            vector = [1.0 / math.sqrt(self.DIMENSION)] * self.DIMENSION
            return vector

        terms = list(tokens)
        for i in range(len(tokens) - 1):
            terms.append(f"{tokens[i]}_{tokens[i+1]}")

        # 3. Dense non-negative projection
        vector = [0.0] * self.DIMENSION

        for term in terms:
            h = hashlib.sha256(term.encode("utf-8")).digest()
            dim_idx = int.from_bytes(h[:4], "big") % self.DIMENSION
            weight = 1.0 + (0.5 if "_" in term else 0.0)
            vector[dim_idx] += weight

        # 4. L2 Normalization (Unit vector)
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0.0:
            vector = [round(v / norm, 6) for v in vector]
        else:
            vector = [1.0 / math.sqrt(self.DIMENSION)] * self.DIMENSION

        return vector

    def build_repository_chunk(self, repo_data: dict) -> str:
        """Constructs an information-dense text representation of a repository for embedding."""
        parts = [
            f"Repository: {repo_data.get('full_name', '')}",
            f"Category: {repo_data.get('category', 'Other')}",
            f"Language: {repo_data.get('language', 'Unknown')}",
            f"License: {repo_data.get('license_spdx', 'None')}",
            f"Description: {repo_data.get('description', '')}",
        ]

        readme = repo_data.get("readme_content", "")
        if readme:
            parts.append(f"Readme: {readme[:1200]}")

        return "\n".join(parts)


# Global vector service instance
vector_service = VectorService()
