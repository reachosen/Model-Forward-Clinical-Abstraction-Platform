"""
Quality Controller - Q Principle (Quality)

Enforces quality gates, performance monitoring, and retrieval evaluation
using golden corpus and production-aligned metrics.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class QualityController:
    """
    Quality Controller implementing the Q Principle (Quality).

    Responsibilities:
    - Validate retrieval quality (Recall@k, MRR)
    - Validate response quality (accuracy, citations)
    - Enforce quality gates
    - Track performance metrics
    - Compare against golden corpus
    """

    def __init__(
        self,
        config: Dict[str, Any],
        quality_gates: Optional[Dict[str, Any]] = None,
        golden_corpus_id: Optional[str] = None
    ):
        """
        Initialize Quality Controller.

        Args:
            config: Full CA Factory configuration
            quality_gates: Quality gate thresholds
            golden_corpus_id: Reference to golden corpus
        """
        self.config = config
        self.quality_gates = quality_gates or {}
        self.golden_corpus_id = golden_corpus_id

        # Metrics tracking
        self._retrieval_metrics: List[Dict[str, Any]] = []
        self._response_metrics: List[Dict[str, Any]] = []
        self._performance_metrics: List[Dict[str, Any]] = []

        # Performance counters
        self._total_requests = 0
        self._failed_quality_gates = 0
        self._cache_hits = 0
        self._cache_misses = 0

        logger.info(
            f"Quality Controller initialized with corpus: {golden_corpus_id}"
        )

    def validate_retrieval_results(
        self,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate retrieval quality against quality gates.

        Args:
            result: Retrieval results

        Returns:
            Validation result with pass/fail status
        """
        logger.debug("Validating retrieval results")

        validation = {
            "passed": True,
            "failures": [],
            "metrics": {}
        }

        retrieval_stats = result.get("retrieval_stats", {})

        # Check minimum relevance score
        avg_relevance = retrieval_stats.get("avg_relevance_score", 0)
        min_relevance = self.quality_gates.get("min_recall_at_5", 0)  # Using as proxy

        if avg_relevance < min_relevance:
            validation["passed"] = False
            validation["failures"].append(
                f"Average relevance {avg_relevance} below threshold {min_relevance}"
            )

        validation["metrics"]["avg_relevance_score"] = avg_relevance

        # Track metrics
        self._retrieval_metrics.append({
            "timestamp": datetime.utcnow().isoformat(),
            "avg_relevance_score": avg_relevance,
            "documents_retrieved": retrieval_stats.get("documents_retrieved", 0),
            "documents_used": retrieval_stats.get("documents_used", 0)
        })

        return validation

    def validate_qa_response(
        self,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate Q&A response quality against quality gates.

        Args:
            result: Q&A response

        Returns:
            Validation result with pass/fail status
        """
        logger.debug("Validating Q&A response")

        validation = {
            "passed": True,
            "failures": [],
            "metrics": {}
        }

        # Check confidence threshold
        confidence = result.get("confidence", 0)
        min_confidence = 0.7  # Default threshold

        if confidence < min_confidence:
            validation["passed"] = False
            validation["failures"].append(
                f"Confidence {confidence} below threshold {min_confidence}"
            )

        validation["metrics"]["confidence"] = confidence

        # Check citation quality
        evidence_citations = result.get("evidence_citations", [])
        min_citations = 1

        if len(evidence_citations) < min_citations:
            validation["passed"] = False
            validation["failures"].append(
                f"Citation count {len(evidence_citations)} below minimum {min_citations}"
            )

        validation["metrics"]["citation_count"] = len(evidence_citations)

        # Check citation relevance scores
        if evidence_citations:
            avg_citation_relevance = sum(
                c.get("relevance_score", 0) for c in evidence_citations
            ) / len(evidence_citations)

            min_citation_quality = self.quality_gates.get("min_citation_quality", 0.85)

            if avg_citation_relevance < min_citation_quality:
                validation["passed"] = False
                validation["failures"].append(
                    f"Citation quality {avg_citation_relevance} below threshold {min_citation_quality}"
                )

            validation["metrics"]["avg_citation_relevance"] = avg_citation_relevance

        # Track metrics
        self._response_metrics.append({
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": confidence,
            "citation_count": len(evidence_citations),
            "avg_citation_relevance": validation["metrics"].get("avg_citation_relevance", 0)
        })

        return validation

    def validate_rule_evaluation(
        self,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate rule evaluation quality.

        Args:
            result: Rule evaluation results

        Returns:
            Validation result
        """
        logger.debug("Validating rule evaluation")

        validation = {
            "passed": True,
            "failures": [],
            "metrics": {}
        }

        summary = result.get("summary", {})

        # Check overall confidence
        overall_confidence = summary.get("overallConfidence", 0)
        min_confidence = 0.7

        if overall_confidence < min_confidence:
            validation["passed"] = False
            validation["failures"].append(
                f"Overall confidence {overall_confidence} below threshold {min_confidence}"
            )

        validation["metrics"]["overall_confidence"] = overall_confidence

        # Check required rules passed
        required_passed = summary.get("requiredRulesPassed", 0)
        required_total = summary.get("requiredRulesTotal", 0)

        if required_total > 0:
            required_rate = required_passed / required_total
            validation["metrics"]["required_rules_rate"] = required_rate

            if required_rate < 0.8:  # At least 80% of required rules should pass
                validation["passed"] = False
                validation["failures"].append(
                    f"Required rules pass rate {required_rate} is low"
                )

        return validation

    def calculate_recall_at_k(
        self,
        retrieved_docs: List[str],
        relevant_docs: List[str],
        k: int
    ) -> float:
        """
        Calculate Recall@k metric.

        Args:
            retrieved_docs: List of retrieved document IDs
            relevant_docs: List of relevant document IDs (from golden corpus)
            k: Number of top results to consider

        Returns:
            Recall@k score
        """
        if not relevant_docs:
            return 0.0

        top_k = retrieved_docs[:k]
        relevant_in_top_k = set(top_k) & set(relevant_docs)

        recall = len(relevant_in_top_k) / len(relevant_docs)

        logger.debug(f"Recall@{k}: {recall:.3f}")

        return recall

    def calculate_mrr(
        self,
        retrieved_docs: List[str],
        relevant_docs: List[str]
    ) -> float:
        """
        Calculate Mean Reciprocal Rank (MRR).

        Args:
            retrieved_docs: List of retrieved document IDs
            relevant_docs: List of relevant document IDs

        Returns:
            MRR score
        """
        for i, doc in enumerate(retrieved_docs):
            if doc in relevant_docs:
                mrr = 1.0 / (i + 1)
                logger.debug(f"MRR: {mrr:.3f} (rank: {i+1})")
                return mrr

        return 0.0

    def check_quality_gates(
        self,
        metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Check if metrics pass quality gates.

        Args:
            metrics: Measured metrics

        Returns:
            Gate check results
        """
        result = {
            "passed": True,
            "failures": []
        }

        # Retrieval quality gates
        if "recall_at_5" in metrics:
            min_recall_5 = self.quality_gates.get("min_recall_at_5", 0.85)
            if metrics["recall_at_5"] < min_recall_5:
                result["passed"] = False
                result["failures"].append(
                    f"Recall@5 {metrics['recall_at_5']} < {min_recall_5}"
                )

        if "recall_at_10" in metrics:
            min_recall_10 = self.quality_gates.get("min_recall_at_10", 0.90)
            if metrics["recall_at_10"] < min_recall_10:
                result["passed"] = False
                result["failures"].append(
                    f"Recall@10 {metrics['recall_at_10']} < {min_recall_10}"
                )

        if "mrr" in metrics:
            min_mrr = self.quality_gates.get("min_mrr", 0.90)
            if metrics["mrr"] < min_mrr:
                result["passed"] = False
                result["failures"].append(
                    f"MRR {metrics['mrr']} < {min_mrr}"
                )

        # Response quality gates
        if "clinical_accuracy" in metrics:
            min_accuracy = self.quality_gates.get("min_clinical_accuracy", 0.90)
            if metrics["clinical_accuracy"] < min_accuracy:
                result["passed"] = False
                result["failures"].append(
                    f"Clinical accuracy {metrics['clinical_accuracy']} < {min_accuracy}"
                )

        # Performance gates
        if "p95_latency_ms" in metrics:
            max_latency = self.quality_gates.get("max_p95_latency_ms", 5000)
            if metrics["p95_latency_ms"] > max_latency:
                result["passed"] = False
                result["failures"].append(
                    f"P95 latency {metrics['p95_latency_ms']}ms > {max_latency}ms"
                )

        if "cache_hit_rate" in metrics:
            min_cache_hit = self.quality_gates.get("min_cache_hit_rate", 0.60)
            if metrics["cache_hit_rate"] < min_cache_hit:
                result["passed"] = False
                result["failures"].append(
                    f"Cache hit rate {metrics['cache_hit_rate']} < {min_cache_hit}"
                )

        if not result["passed"]:
            self._failed_quality_gates += 1
            logger.warning(f"Quality gates failed: {result['failures']}")

        return result

    def track_performance(
        self,
        latency_ms: float,
        tokens_used: int,
        cache_hit: bool
    ) -> None:
        """
        Track performance metrics.

        Args:
            latency_ms: Request latency in milliseconds
            tokens_used: Number of tokens used
            cache_hit: Whether request was served from cache
        """
        self._total_requests += 1

        if cache_hit:
            self._cache_hits += 1
        else:
            self._cache_misses += 1

        self._performance_metrics.append({
            "timestamp": datetime.utcnow().isoformat(),
            "latency_ms": latency_ms,
            "tokens_used": tokens_used,
            "cache_hit": cache_hit
        })

        # Keep only recent metrics (last 1000)
        if len(self._performance_metrics) > 1000:
            self._performance_metrics = self._performance_metrics[-1000:]

    async def get_metrics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated quality metrics.

        Args:
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            Aggregated metrics
        """
        # Calculate retrieval metrics
        retrieval_metrics = self._aggregate_retrieval_metrics()

        # Calculate response metrics
        response_metrics = self._aggregate_response_metrics()

        # Calculate performance metrics
        performance_metrics = self._aggregate_performance_metrics()

        return {
            "retrieval_metrics": retrieval_metrics,
            "response_metrics": response_metrics,
            "performance_metrics": performance_metrics,
            "aggregation_period": {
                "start": start_date or "all_time",
                "end": end_date or "now"
            }
        }

    def _aggregate_retrieval_metrics(self) -> Dict[str, Any]:
        """Aggregate retrieval metrics."""
        if not self._retrieval_metrics:
            return {
                "total_queries": 0,
                "avg_relevance_score": 0,
                "recall_at_5": 0,
                "recall_at_10": 0,
                "mrr": 0
            }

        total = len(self._retrieval_metrics)
        avg_relevance = sum(m["avg_relevance_score"] for m in self._retrieval_metrics) / total

        return {
            "total_queries": total,
            "avg_relevance_score": round(avg_relevance, 3),
            "recall_at_5": 0.87,  # Mock - would calculate from golden corpus
            "recall_at_10": 0.92,  # Mock
            "mrr": 0.91  # Mock
        }

    def _aggregate_response_metrics(self) -> Dict[str, Any]:
        """Aggregate response metrics."""
        if not self._response_metrics:
            return {
                "total_responses": 0,
                "avg_confidence": 0,
                "avg_citation_count": 0,
                "citation_quality": 0,
                "clinical_accuracy": 0,
                "confidence_calibration_error": 0,
                "sme_validation_rate": 0
            }

        total = len(self._response_metrics)
        avg_confidence = sum(m["confidence"] for m in self._response_metrics) / total
        avg_citations = sum(m["citation_count"] for m in self._response_metrics) / total

        return {
            "total_responses": total,
            "avg_confidence": round(avg_confidence, 3),
            "avg_citation_count": round(avg_citations, 1),
            "citation_quality": 0.88,  # Mock - would validate with SME
            "clinical_accuracy": 0.92,  # Mock
            "confidence_calibration_error": 0.08,  # Mock
            "sme_validation_rate": 0.15  # Mock
        }

    def _aggregate_performance_metrics(self) -> Dict[str, Any]:
        """Aggregate performance metrics."""
        if not self._performance_metrics:
            return {
                "avg_latency_ms": 0,
                "p50_latency_ms": 0,
                "p95_latency_ms": 0,
                "p99_latency_ms": 0,
                "cache_hit_rate": 0,
                "avg_tokens_per_request": 0
            }

        latencies = sorted([m["latency_ms"] for m in self._performance_metrics])
        tokens = [m["tokens_used"] for m in self._performance_metrics]

        total_requests = self._cache_hits + self._cache_misses
        cache_hit_rate = self._cache_hits / total_requests if total_requests > 0 else 0

        return {
            "avg_latency_ms": round(sum(latencies) / len(latencies), 1),
            "p50_latency_ms": round(latencies[len(latencies) // 2], 1),
            "p95_latency_ms": round(latencies[int(len(latencies) * 0.95)], 1),
            "p99_latency_ms": round(latencies[int(len(latencies) * 0.99)], 1),
            "cache_hit_rate": round(cache_hit_rate, 3),
            "avg_tokens_per_request": round(sum(tokens) / len(tokens), 1)
        }

    def reset_metrics(self) -> None:
        """Reset all metrics."""
        self._retrieval_metrics.clear()
        self._response_metrics.clear()
        self._performance_metrics.clear()
        self._total_requests = 0
        self._failed_quality_gates = 0
        self._cache_hits = 0
        self._cache_misses = 0

        logger.info("Quality metrics reset")
