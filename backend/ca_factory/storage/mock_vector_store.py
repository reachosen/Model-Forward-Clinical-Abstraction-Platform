"""
Mock Vector Store

In-memory vector store for demo/testing without Pinecone or other vector databases.
"""

import logging
from typing import Dict, Any, List, Optional
import hashlib

logger = logging.getLogger(__name__)


class MockVectorStore:
    """
    Mock vector store that performs simple text-based search.

    In production, this would be replaced with Pinecone, Weaviate, or Chroma.
    """

    def __init__(self):
        """Initialize mock vector store."""
        self._documents: Dict[str, Dict[str, Any]] = {}
        self._index_name = "mock_index"

        logger.info("Mock vector store initialized")

    def index_document(
        self,
        document_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Index a document.

        Args:
            document_id: Unique document identifier
            content: Document content
            metadata: Optional metadata
        """
        self._documents[document_id] = {
            "content": content,
            "metadata": metadata or {},
            "embedding_hash": self._mock_embedding(content)
        }

        logger.debug(f"Indexed document: {document_id}")

    def search(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.

        Args:
            query: Search query
            top_k: Number of results to return
            filters: Optional metadata filters

        Returns:
            List of search results with relevance scores
        """
        query_lower = query.lower()
        results = []

        for doc_id, doc_data in self._documents.items():
            content = doc_data["content"].lower()
            metadata = doc_data["metadata"]

            # Apply filters if provided
            if filters:
                if not self._matches_filters(metadata, filters):
                    continue

            # Simple text matching (in production, this would use vector similarity)
            if query_lower in content:
                # Calculate simple relevance score
                # Count occurrences of query terms
                query_terms = query_lower.split()
                match_count = sum(content.count(term) for term in query_terms)
                total_words = len(content.split())

                relevance_score = min(1.0, (match_count / total_words) * 50)

                results.append({
                    "document_id": doc_id,
                    "content": doc_data["content"],
                    "metadata": metadata,
                    "relevance_score": relevance_score
                })

        # Sort by relevance and return top_k
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]

    def delete_document(self, document_id: str) -> None:
        """Delete a document from the index."""
        if document_id in self._documents:
            del self._documents[document_id]
            logger.debug(f"Deleted document: {document_id}")

    def clear_index(self) -> None:
        """Clear all documents from the index."""
        self._documents.clear()
        logger.info("Vector store cleared")

    def get_document_count(self) -> int:
        """Get total number of indexed documents."""
        return len(self._documents)

    def _mock_embedding(self, text: str) -> str:
        """Create a mock embedding hash (for demo purposes)."""
        return hashlib.md5(text.encode()).hexdigest()[:16]

    def _matches_filters(
        self,
        metadata: Dict[str, Any],
        filters: Dict[str, Any]
    ) -> bool:
        """
        Check if metadata matches filters.

        Args:
            metadata: Document metadata
            filters: Filter criteria

        Returns:
            True if metadata matches all filters
        """
        for key, value in filters.items():
            if key not in metadata:
                return False

            if isinstance(value, list):
                # Check if metadata value is in list
                if metadata[key] not in value:
                    return False
            else:
                # Exact match
                if metadata[key] != value:
                    return False

        return True

    def bulk_index(
        self,
        documents: List[Dict[str, Any]]
    ) -> None:
        """
        Index multiple documents at once.

        Args:
            documents: List of documents with id, content, and metadata
        """
        for doc in documents:
            self.index_document(
                document_id=doc["id"],
                content=doc["content"],
                metadata=doc.get("metadata")
            )

        logger.info(f"Bulk indexed {len(documents)} documents")

    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics."""
        return {
            "index_name": self._index_name,
            "document_count": len(self._documents),
            "type": "mock"
        }
