"""
CA Factory - Main Factory Class

The central orchestrator that manages agent creation, configuration loading,
and coordination between agents, delegation, and quality control systems.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from ca_factory.core.agent_manager import AgentManager
from ca_factory.core.delegation import DelegationEngine
from ca_factory.core.quality_control import QualityController


logger = logging.getLogger(__name__)


class CAFactory:
    """
    Context Architect Factory

    Main factory class implementing the R/D/Q principles:
    - R (Reduction): Context control via agent manager
    - D (Delegation): Task distribution via delegation engine
    - Q (Quality): Performance gating via quality controller
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize CA Factory with configuration.

        Args:
            config: Configuration dictionary matching CAFactoryConfig schema
        """
        self.config = config
        self.domain = config.get("project_domain", "UNKNOWN")
        self.version = config.get("rca_config_version", "1.0.0")

        # Initialize core components
        self.agent_manager = AgentManager(
            config=config,
            max_tokens=config.get("core_memory_max_tokens", 8000),
            pruning_policy=config.get("pruning_policy", {}),
            priming_config=config.get("priming_config", {})
        )

        self.delegation_engine = DelegationEngine(
            config=config,
            delegated_tasks=config.get("delegated_task_list", []),
            thresholds=config.get("delegation_thresholds", {})
        )

        self.quality_controller = QualityController(
            config=config,
            quality_gates=config.get("quality_gates", {}),
            golden_corpus_id=config.get("golden_corpus_id")
        )

        # Agent registry
        self._agents: Dict[str, Any] = {}
        self._load_agent_profiles()

        logger.info(
            f"CA Factory initialized for domain: {self.domain} v{self.version}"
        )

    def _load_agent_profiles(self) -> None:
        """Load agent profiles from configuration."""
        agent_profiles = self.config.get("agent_profiles", [])

        for profile in agent_profiles:
            agent_id = profile.get("agent_id")
            if agent_id:
                self._agents[agent_id] = profile
                logger.debug(f"Loaded agent profile: {agent_id}")

        logger.info(f"Loaded {len(self._agents)} agent profiles")

    async def ask_question(
        self,
        patient_id: str,
        question: str,
        encounter_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Ask a question about a clinical case.

        Args:
            patient_id: Patient identifier
            question: Natural language question
            encounter_id: Optional encounter identifier
            context: Additional context

        Returns:
            Response with answer, evidence citations, and metadata
        """
        start_time = datetime.utcnow()

        # Determine if delegation is needed
        should_delegate = self.delegation_engine.should_delegate(
            task_type="qa_response",
            estimated_complexity=self._estimate_complexity(question)
        )

        if should_delegate:
            logger.info(f"Delegating Q&A task for patient {patient_id}")
            result = await self._delegate_qa_task(
                patient_id=patient_id,
                question=question,
                encounter_id=encounter_id,
                context=context
            )
        else:
            logger.info(f"Handling Q&A task directly for patient {patient_id}")
            result = await self._execute_qa_task(
                patient_id=patient_id,
                question=question,
                encounter_id=encounter_id,
                context=context
            )

        # Quality control validation
        qa_validated = self.quality_controller.validate_qa_response(result)
        if not qa_validated["passed"]:
            logger.warning(
                f"Q&A response failed quality gates: {qa_validated['failures']}"
            )
            # Handle quality failure based on fail_action
            fail_action = self.config.get("quality_gates", {}).get("fail_action", "warn")
            if fail_action == "block":
                raise ValueError(f"Response failed quality gates: {qa_validated['failures']}")

        # Add execution metadata
        execution_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        result["agent_info"] = {
            **result.get("agent_info", {}),
            "execution_time_ms": execution_time_ms,
            "quality_validation": qa_validated
        }

        return result

    async def evaluate_rules(
        self,
        patient_id: str,
        encounter_id: Optional[str] = None,
        domain: Optional[str] = None,
        include_evidence: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate NHSN rules for a clinical case.

        Args:
            patient_id: Patient identifier
            encounter_id: Optional encounter identifier
            domain: Domain (CLABSI, CAUTI, etc.)
            include_evidence: Include detailed evidence

        Returns:
            Rule evaluation results with summary and detailed evaluations
        """
        start_time = datetime.utcnow()

        domain = domain or self.domain

        # Determine if delegation is needed
        should_delegate = self.delegation_engine.should_delegate(
            task_type="rule_evaluation",
            estimated_complexity={"multi_rule": True}
        )

        if should_delegate:
            logger.info(f"Delegating rule evaluation for patient {patient_id}")
            result = await self._delegate_rule_evaluation(
                patient_id=patient_id,
                encounter_id=encounter_id,
                domain=domain,
                include_evidence=include_evidence
            )
        else:
            logger.info(f"Handling rule evaluation directly for patient {patient_id}")
            result = await self._execute_rule_evaluation(
                patient_id=patient_id,
                encounter_id=encounter_id,
                domain=domain,
                include_evidence=include_evidence
            )

        # Quality control validation
        eval_validated = self.quality_controller.validate_rule_evaluation(result)
        if not eval_validated["passed"]:
            logger.warning(
                f"Rule evaluation failed quality gates: {eval_validated['failures']}"
            )

        # Add execution metadata
        execution_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        result["agent_info"] = {
            **result.get("agent_info", {}),
            "execution_time_ms": execution_time_ms,
            "quality_validation": eval_validated
        }

        return result

    async def retrieve_evidence(
        self,
        patient_id: str,
        query: str,
        encounter_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        Retrieve clinical evidence for a query.

        Args:
            patient_id: Patient identifier
            query: Search query
            encounter_id: Optional encounter identifier
            filters: Optional filters (source types, date range, etc.)
            top_k: Number of results to return

        Returns:
            Evidence retrieval results with relevance scores
        """
        start_time = datetime.utcnow()

        # Evidence retrieval is typically not delegated
        result = await self._execute_evidence_retrieval(
            patient_id=patient_id,
            query=query,
            encounter_id=encounter_id,
            filters=filters,
            top_k=top_k
        )

        # Quality control validation
        retrieval_validated = self.quality_controller.validate_retrieval_results(result)
        if not retrieval_validated["passed"]:
            logger.warning(
                f"Evidence retrieval failed quality gates: {retrieval_validated['failures']}"
            )

        # Add execution metadata
        execution_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        result["agent_info"] = {
            **result.get("agent_info", {}),
            "execution_time_ms": execution_time_ms,
            "quality_validation": retrieval_validated
        }

        return result

    def _estimate_complexity(self, question: str) -> Dict[str, Any]:
        """
        Estimate question complexity for delegation decision.

        Args:
            question: Natural language question

        Returns:
            Complexity metrics
        """
        # Simple heuristic-based complexity estimation
        words = question.split()

        return {
            "word_count": len(words),
            "has_multiple_clauses": "and" in question.lower() or "or" in question.lower(),
            "has_temporal_aspect": any(word in question.lower() for word in ["when", "timeline", "before", "after"]),
            "estimated_tokens": len(words) * 2  # Rough estimate
        }

    async def _execute_qa_task(
        self,
        patient_id: str,
        question: str,
        encounter_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute Q&A task directly (no delegation)."""
        # Get Q&A agent
        qa_agent_id = self._find_agent_by_type("qa")
        if not qa_agent_id:
            raise ValueError("No Q&A agent configured")

        # Execute using agent manager
        result = await self.agent_manager.execute_agent(
            agent_id=qa_agent_id,
            task_type="qa_response",
            inputs={
                "patient_id": patient_id,
                "question": question,
                "encounter_id": encounter_id,
                "context": context or {}
            }
        )

        return result

    async def _delegate_qa_task(
        self,
        patient_id: str,
        question: str,
        encounter_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Delegate Q&A task to sub-agent."""
        # Create context bundle
        context_bundle = self.delegation_engine.create_context_bundle(
            task_type="qa_response",
            inputs={
                "patient_id": patient_id,
                "question": question,
                "encounter_id": encounter_id
            }
        )

        # Spawn sub-agent
        result = await self.delegation_engine.spawn_subagent(
            agent_type="qa",
            context_bundle=context_bundle,
            timeout=self.config.get("delegation_thresholds", {}).get("subagent_timeout_seconds", 60)
        )

        return result

    async def _execute_rule_evaluation(
        self,
        patient_id: str,
        encounter_id: Optional[str] = None,
        domain: Optional[str] = None,
        include_evidence: bool = True
    ) -> Dict[str, Any]:
        """Execute rule evaluation task directly."""
        rule_agent_id = self._find_agent_by_type("evaluation")
        if not rule_agent_id:
            raise ValueError("No rule evaluation agent configured")

        result = await self.agent_manager.execute_agent(
            agent_id=rule_agent_id,
            task_type="rule_evaluation",
            inputs={
                "patient_id": patient_id,
                "encounter_id": encounter_id,
                "domain": domain,
                "include_evidence": include_evidence
            }
        )

        return result

    async def _delegate_rule_evaluation(
        self,
        patient_id: str,
        encounter_id: Optional[str] = None,
        domain: Optional[str] = None,
        include_evidence: bool = True
    ) -> Dict[str, Any]:
        """Delegate rule evaluation to sub-agent."""
        context_bundle = self.delegation_engine.create_context_bundle(
            task_type="rule_evaluation",
            inputs={
                "patient_id": patient_id,
                "encounter_id": encounter_id,
                "domain": domain,
                "include_evidence": include_evidence
            }
        )

        result = await self.delegation_engine.spawn_subagent(
            agent_type="evaluation",
            context_bundle=context_bundle,
            timeout=self.config.get("delegation_thresholds", {}).get("subagent_timeout_seconds", 60)
        )

        return result

    async def _execute_evidence_retrieval(
        self,
        patient_id: str,
        query: str,
        encounter_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """Execute evidence retrieval task."""
        retrieval_agent_id = self._find_agent_by_type("retrieval")
        if not retrieval_agent_id:
            raise ValueError("No evidence retrieval agent configured")

        result = await self.agent_manager.execute_agent(
            agent_id=retrieval_agent_id,
            task_type="evidence_retrieval",
            inputs={
                "patient_id": patient_id,
                "query": query,
                "encounter_id": encounter_id,
                "filters": filters or {},
                "top_k": top_k
            }
        )

        return result

    def _find_agent_by_type(self, agent_type: str) -> Optional[str]:
        """Find first agent matching the given type."""
        for agent_id, profile in self._agents.items():
            if profile.get("agent_type") == agent_type:
                return agent_id
        return None

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on CA Factory and its components.

        Returns:
            Health status of all components
        """
        return {
            "status": "healthy",
            "domain": self.domain,
            "version": self.version,
            "agents_loaded": len(self._agents),
            "components": {
                "agent_manager": "healthy",
                "delegation_engine": "healthy",
                "quality_controller": "healthy"
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_metrics(self) -> Dict[str, Any]:
        """
        Get performance metrics from quality controller.

        Returns:
            Performance metrics
        """
        return await self.quality_controller.get_metrics()
