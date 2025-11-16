"""
Evidence Retrieval Agent

Specialized agent for retrieving relevant clinical evidence from patient data
using semantic search and relevance ranking.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ca_factory.agents.base import BaseAgent, AgentValidationError

logger = logging.getLogger(__name__)


class EvidenceRetrievalAgent(BaseAgent):
    """
    Evidence Retrieval Agent for semantic search over clinical data.

    Responsibilities:
    - Query vector store for relevant evidence
    - Apply filters (source type, date range, etc.)
    - Rank results by relevance
    - Return evidence with citations
    """

    def __init__(
        self,
        agent_id: str,
        config: Dict[str, Any]
    ):
        """
        Initialize Evidence Retrieval Agent.

        Args:
            agent_id: Unique agent identifier
            config: Agent configuration
        """
        super().__init__(
            agent_id=agent_id,
            agent_type="retrieval",
            config=config
        )

        self.default_top_k = 10
        self.min_relevance_score = 0.5

    async def execute(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute evidence retrieval task.

        Args:
            inputs: Task inputs containing:
                - patient_id: Patient identifier
                - query: Search query
                - encounter_id: Optional encounter identifier
                - filters: Optional filters
                - top_k: Number of results to return

        Returns:
            Evidence retrieval results
        """
        start_time = datetime.utcnow()

        # Validate inputs
        validation = self.validate_inputs(inputs)
        if not validation["valid"]:
            raise AgentValidationError(
                agent_id=self.agent_id,
                validation_type="input",
                errors=validation["errors"]
            )

        patient_id = inputs["patient_id"]
        query = inputs["query"]
        encounter_id = inputs.get("encounter_id")
        filters = inputs.get("filters", {})
        top_k = inputs.get("top_k", self.default_top_k)

        logger.info(
            f"Retrieving evidence for patient {patient_id}, query: '{query}'"
        )

        # Build search query
        search_query = self._build_search_query(query, filters)

        # Execute vector search (mock implementation)
        raw_results = await self._execute_vector_search(
            patient_id=patient_id,
            query=search_query,
            encounter_id=encounter_id,
            top_k=top_k * 2  # Retrieve more than needed for filtering
        )

        # Apply filters
        filtered_results = self._apply_filters(raw_results, filters)

        # Rank and select top-k
        ranked_results = self._rank_results(filtered_results)[:top_k]

        # Calculate retrieval stats
        retrieval_stats = self._calculate_retrieval_stats(
            raw_results=raw_results,
            filtered_results=filtered_results,
            final_results=ranked_results
        )

        # Build output
        output = {
            "query": query,
            "results": self._format_results(ranked_results),
            "retrieval_stats": retrieval_stats,
            "agent_info": {
                "agent_id": self.agent_id,
                "execution_time_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                "tokens_used": len(query) // 4 + 100  # Mock
            }
        }

        # Validate output
        output_validation = self.validate_output(output)
        if not output_validation["valid"]:
            logger.warning(f"Output validation issues: {output_validation['warnings']}")

        # Log execution
        execution_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        self.log_execution(inputs, output, execution_time_ms)

        return output

    def validate_inputs(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate input parameters.

        Args:
            inputs: Input parameters

        Returns:
            Validation result
        """
        errors = []

        # Required fields
        if "patient_id" not in inputs:
            errors.append("Missing required field: patient_id")

        if "query" not in inputs:
            errors.append("Missing required field: query")

        # Query length validation
        if "query" in inputs:
            query = inputs["query"]
            if not query or len(query.strip()) == 0:
                errors.append("Query cannot be empty")
            elif len(query) > 1000:
                errors.append("Query too long (max 1000 characters)")

        # Top-k validation
        if "top_k" in inputs:
            top_k = inputs["top_k"]
            if not isinstance(top_k, int) or top_k < 1 or top_k > 100:
                errors.append("top_k must be between 1 and 100")

        return {
            "valid": len(errors) == 0,
            "errors": errors
        }

    def validate_output(
        self,
        output: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate output before returning.

        Args:
            output: Agent output

        Returns:
            Validation result
        """
        warnings = []

        # Check if results are empty
        results = output.get("results", [])
        if len(results) == 0:
            warnings.append("No results found")

        # Check relevance scores
        if results:
            avg_relevance = sum(r["relevance_score"] for r in results) / len(results)
            if avg_relevance < 0.6:
                warnings.append(f"Low average relevance score: {avg_relevance:.2f}")

        return {
            "valid": True,
            "warnings": warnings
        }

    def _build_search_query(
        self,
        query: str,
        filters: Dict[str, Any]
    ) -> str:
        """
        Build enhanced search query with filters.

        Args:
            query: Original query
            filters: Search filters

        Returns:
            Enhanced query
        """
        # In production, this would enhance the query with filter context
        # For now, just return the original query
        return query

    async def _execute_vector_search(
        self,
        patient_id: str,
        query: str,
        encounter_id: Optional[str],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Execute vector search (mock implementation).

        Args:
            patient_id: Patient identifier
            query: Search query
            encounter_id: Optional encounter identifier
            top_k: Number of results

        Returns:
            Raw search results
        """
        # Mock implementation
        # In production, this would:
        # 1. Generate query embedding
        # 2. Search vector store
        # 3. Return results with relevance scores

        logger.debug(f"Executing vector search for query: '{query}'")

        # Generate mock results
        mock_results = []
        for i in range(min(top_k, 15)):
            mock_results.append({
                "evidence_id": f"EV-{patient_id}-{i:04d}",
                "source_type": ["SIGNAL", "EVENT", "LAB", "NOTE"][i % 4],
                "source_id": f"SRC-{i:04d}",
                "content": f"Mock evidence content {i} related to: {query}",
                "relevance_score": 0.95 - (i * 0.05),  # Decreasing relevance
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {
                    "patient_id": patient_id,
                    "encounter_id": encounter_id
                }
            })

        return mock_results

    def _apply_filters(
        self,
        results: List[Dict[str, Any]],
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Apply filters to search results.

        Args:
            results: Raw results
            filters: Filter criteria

        Returns:
            Filtered results
        """
        filtered = results.copy()

        # Source type filter
        source_types = filters.get("source_types", [])
        if source_types:
            filtered = [
                r for r in filtered
                if r["source_type"] in source_types
            ]

        # Date range filter
        date_range = filters.get("date_range")
        if date_range:
            # Would implement date filtering here
            pass

        # Min relevance filter
        min_relevance = filters.get("min_relevance", self.min_relevance_score)
        filtered = [
            r for r in filtered
            if r["relevance_score"] >= min_relevance
        ]

        logger.debug(
            f"Filtered {len(results)} results to {len(filtered)}"
        )

        return filtered

    def _rank_results(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rank results by relevance.

        Args:
            results: Filtered results

        Returns:
            Ranked results
        """
        # Sort by relevance score (descending)
        return sorted(
            results,
            key=lambda r: r["relevance_score"],
            reverse=True
        )

    def _calculate_retrieval_stats(
        self,
        raw_results: List[Dict[str, Any]],
        filtered_results: List[Dict[str, Any]],
        final_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate retrieval statistics.

        Args:
            raw_results: Raw search results
            filtered_results: After filters
            final_results: Final ranked results

        Returns:
            Retrieval stats
        """
        avg_relevance = 0.0
        if final_results:
            avg_relevance = sum(
                r["relevance_score"] for r in final_results
            ) / len(final_results)

        return {
            "documents_retrieved": len(raw_results),
            "documents_after_filters": len(filtered_results),
            "documents_used": len(final_results),
            "avg_relevance_score": round(avg_relevance, 3)
        }

    def _format_results(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Format results for output.

        Args:
            results: Ranked results

        Returns:
            Formatted results
        """
        formatted = []

        for result in results:
            formatted.append({
                "evidence_id": result["evidence_id"],
                "source_type": result["source_type"],
                "source_id": result["source_id"],
                "content": result["content"],
                "relevance_score": result["relevance_score"],
                "timestamp": result.get("timestamp"),
                "metadata": result.get("metadata", {})
            })

        return formatted
