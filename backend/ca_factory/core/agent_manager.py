"""
Agent Manager - R Principle (Reduction)

Manages agent lifecycle, context control, token budgeting, and memory management.
Implements strict context control through pruning and dynamic priming.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)


class AgentManager:
    """
    Agent Manager implementing the R Principle (Reduction).

    Responsibilities:
    - Agent lifecycle management (create, execute, destroy)
    - Token budget tracking and enforcement
    - Context pruning strategies
    - Dynamic knowledge priming
    - Memory management
    """

    def __init__(
        self,
        config: Dict[str, Any],
        max_tokens: int = 8000,
        pruning_policy: Optional[Dict[str, Any]] = None,
        priming_config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize Agent Manager.

        Args:
            config: Full CA Factory configuration
            max_tokens: Maximum tokens for agent context
            pruning_policy: Token pruning rules
            priming_config: Dynamic priming configuration
        """
        self.config = config
        self.max_tokens = max_tokens
        self.pruning_policy = pruning_policy or {}
        self.priming_config = priming_config or {}

        # Active agent tracking
        self._active_agents: Dict[str, Any] = {}
        self._token_usage: Dict[str, int] = {}

        # Priming cache
        self._primed_knowledge: Dict[str, Any] = {}

        logger.info(
            f"Agent Manager initialized with max_tokens={max_tokens}"
        )

    async def execute_agent(
        self,
        agent_id: str,
        task_type: str,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute an agent with the given inputs.

        Args:
            agent_id: Agent identifier
            task_type: Type of task to execute
            inputs: Task inputs

        Returns:
            Agent execution results
        """
        logger.info(f"Executing agent {agent_id} for task {task_type}")

        # Load agent profile
        agent_profile = self._load_agent_profile(agent_id)
        if not agent_profile:
            raise ValueError(f"Agent profile not found: {agent_id}")

        # Create agent context
        context = await self._create_agent_context(
            agent_profile=agent_profile,
            inputs=inputs
        )

        # Check token budget
        context_tokens = self._estimate_tokens(context)
        if context_tokens > self.max_tokens:
            logger.warning(
                f"Context exceeds max tokens ({context_tokens} > {self.max_tokens}), pruning..."
            )
            context = await self._prune_context(context, target_tokens=self.max_tokens)

        # Execute agent (mock implementation - will be replaced with actual LLM call)
        result = await self._execute_agent_internal(
            agent_id=agent_id,
            agent_profile=agent_profile,
            context=context,
            inputs=inputs
        )

        # Track token usage
        tokens_used = result.get("tokens_used", 0)
        self._token_usage[agent_id] = self._token_usage.get(agent_id, 0) + tokens_used

        logger.info(
            f"Agent {agent_id} completed. Tokens used: {tokens_used}"
        )

        return result

    def _load_agent_profile(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Load agent profile from configuration."""
        agent_profiles = self.config.get("agent_profiles", [])
        for profile in agent_profiles:
            if profile.get("agent_id") == agent_id:
                return profile
        return None

    async def _create_agent_context(
        self,
        agent_profile: Dict[str, Any],
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create agent context with prompts and primed knowledge.

        Args:
            agent_profile: Agent configuration
            inputs: Task inputs

        Returns:
            Agent context dictionary
        """
        context = {
            "system_prompt": agent_profile.get("base_prompt", ""),
            "domain_prompt": agent_profile.get("domain_specific_prompt", ""),
            "inputs": inputs,
            "primed_knowledge": [],
            "tools": agent_profile.get("available_tools", [])
        }

        # Auto-prime if configured
        auto_prime_on = self.priming_config.get("auto_prime_on", [])
        if "new_case" in auto_prime_on:
            primed = await self._auto_prime(inputs)
            if primed:
                context["primed_knowledge"] = primed

        return context

    async def _auto_prime(self, inputs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Automatically load relevant knowledge based on inputs.

        Args:
            inputs: Task inputs

        Returns:
            List of primed knowledge chunks
        """
        priming_commands = self.priming_config.get("priming_commands", {})
        knowledge_base_id = self.priming_config.get("knowledge_base_id")

        primed = []

        # For now, return empty list (will be implemented with vector store)
        # In production, this would query the knowledge base
        logger.debug(f"Auto-priming for knowledge_base: {knowledge_base_id}")

        return primed

    def _estimate_tokens(self, context: Dict[str, Any]) -> int:
        """
        Estimate token count for context.

        Args:
            context: Agent context

        Returns:
            Estimated token count
        """
        # Simple estimation: ~4 chars per token
        text = ""
        text += context.get("system_prompt", "")
        text += context.get("domain_prompt", "")
        text += str(context.get("inputs", {}))

        for knowledge in context.get("primed_knowledge", []):
            text += str(knowledge)

        return len(text) // 4

    async def _prune_context(
        self,
        context: Dict[str, Any],
        target_tokens: int
    ) -> Dict[str, Any]:
        """
        Prune context to meet token budget.

        Args:
            context: Original context
            target_tokens: Target token count

        Returns:
            Pruned context
        """
        logger.info(f"Pruning context to {target_tokens} tokens")

        # Pruning strategy based on policy
        min_relevance_score = self.pruning_policy.get("min_relevance_score", 0.5)
        max_documents = self.pruning_policy.get("max_documents_per_query", 10)

        # Prune primed knowledge first
        if "primed_knowledge" in context:
            knowledge = context["primed_knowledge"]
            # Sort by relevance and limit
            knowledge = sorted(
                knowledge,
                key=lambda k: k.get("relevance_score", 0),
                reverse=True
            )[:max_documents]

            # Filter by min relevance
            knowledge = [
                k for k in knowledge
                if k.get("relevance_score", 0) >= min_relevance_score
            ]

            context["primed_knowledge"] = knowledge

        # Compress verbose outputs if configured
        if self.pruning_policy.get("compress_verbose_outputs", False):
            max_output_tokens = self.pruning_policy.get("max_output_tokens", 2000)
            # Would implement compression here

        # Temporal pruning for inputs with date fields
        temporal_window_days = self.pruning_policy.get("temporal_window_days", 14)
        if temporal_window_days and "inputs" in context:
            context["inputs"] = self._apply_temporal_pruning(
                context["inputs"],
                window_days=temporal_window_days
            )

        return context

    def _apply_temporal_pruning(
        self,
        inputs: Dict[str, Any],
        window_days: int
    ) -> Dict[str, Any]:
        """
        Apply temporal pruning to filter recent events.

        Args:
            inputs: Input data
            window_days: Temporal window in days

        Returns:
            Pruned inputs
        """
        cutoff_date = datetime.utcnow() - timedelta(days=window_days)

        # Keep critical events
        keep_critical = self.pruning_policy.get("keep_critical_events", [])

        # Would implement temporal filtering here based on actual data structure
        logger.debug(f"Temporal pruning with {window_days} day window")

        return inputs

    async def _execute_agent_internal(
        self,
        agent_id: str,
        agent_profile: Dict[str, Any],
        context: Dict[str, Any],
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Internal agent execution (mock implementation).

        In production, this would call the actual LLM API.

        Args:
            agent_id: Agent identifier
            agent_profile: Agent configuration
            context: Agent context
            inputs: Task inputs

        Returns:
            Execution results
        """
        # Mock implementation
        # In production, this would:
        # 1. Build prompt from context
        # 2. Call LLM API (Anthropic Claude)
        # 3. Parse response
        # 4. Validate against min_confidence_threshold
        # 5. Return structured result

        agent_type = agent_profile.get("agent_type")

        logger.info(
            f"Mock execution for agent {agent_id} (type: {agent_type})"
        )

        # Return mock result structure
        return {
            "agent_id": agent_id,
            "agent_type": agent_type,
            "result": f"Mock result for {agent_type}",
            "confidence": 0.85,
            "tokens_used": 1500,
            "execution_time_ms": 1200,
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_token_usage(self, agent_id: Optional[str] = None) -> Dict[str, int]:
        """
        Get token usage statistics.

        Args:
            agent_id: Optional agent ID to get specific usage

        Returns:
            Token usage by agent
        """
        if agent_id:
            return {agent_id: self._token_usage.get(agent_id, 0)}
        return self._token_usage.copy()

    def reset_token_usage(self, agent_id: Optional[str] = None) -> None:
        """
        Reset token usage counters.

        Args:
            agent_id: Optional agent ID to reset specific counter
        """
        if agent_id:
            self._token_usage[agent_id] = 0
        else:
            self._token_usage.clear()

        logger.info(f"Token usage reset for {agent_id or 'all agents'}")

    async def cleanup_agent(self, agent_id: str) -> None:
        """
        Clean up agent resources.

        Args:
            agent_id: Agent identifier
        """
        if agent_id in self._active_agents:
            del self._active_agents[agent_id]

        logger.info(f"Agent {agent_id} cleaned up")
