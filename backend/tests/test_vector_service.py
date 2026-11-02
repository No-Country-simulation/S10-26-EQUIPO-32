"""Unit tests for dense vector generation and similarity.

Verifies:
- RF-03: Embeddings generation
- Principle P6: Consistent vector matching
"""

import math
import unittest
from backend.app.services.vector_service import vector_service


class TestVectorService(unittest.TestCase):
    """Tests dense 384-dimensional vector embedding generation and normalization."""

    def test_vector_dimension_and_unit_normalization(self):
        """Generated embedding must have exactly 384 dimensions and unit L2 norm."""
        text = "PostgreSQL vector database extension for fast semantic search"
        embedding = vector_service.generate_embedding(text)

        self.assertEqual(len(embedding), 384)

        # Compute L2 norm
        norm = math.sqrt(sum(v * v for v in embedding))
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_deterministic_reproducibility(self):
        """Identical input texts must produce identical vectors."""
        text = "FastAPI web framework with async support and Pydantic validation"
        vec1 = vector_service.generate_embedding(text)
        vec2 = vector_service.generate_embedding(text)
        self.assertEqual(vec1, vec2)

    def test_semantic_clustering(self):
        """Related texts should yield higher cosine similarity than unrelated texts."""
        vec_db1 = vector_service.generate_embedding("Postgres relational SQL database storage")
        vec_db2 = vector_service.generate_embedding("PostgreSQL database tables and queries")
        vec_art = vector_service.generate_embedding("Classical oil painting art exhibition in Paris museum")

        def cosine_sim(a, b):
            return sum(x * y for x, y in zip(a, b))

        sim_related = cosine_sim(vec_db1, vec_db2)
        sim_unrelated = cosine_sim(vec_db1, vec_art)

        self.assertGreater(sim_related, sim_unrelated)


if __name__ == "__main__":
    unittest.main()

