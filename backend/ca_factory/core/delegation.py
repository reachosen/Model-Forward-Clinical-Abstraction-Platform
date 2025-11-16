"""
Delegation Engine - D Principle (Delegation)

Manages automatic task distribution to specialized sub-agents based on
complexity analysis and resource availability.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class DelegationEngine:
    """
    Delegation Engine implementing the D Principle (Delegation).

    Responsibilities:
    - Analyze task complexity
    - Route tasks to appropriate agents
    - Spawn and manage sub-agents
    - Create context bundles for delegation
    - Handle parallel sub-agent execution
    """

    def __init__(
        self,
        config: Dict[str, Any],
        delegated_tasks: Optional[List[str]] = None,
        thresholds: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize Delegation Engine.

        Args:
            config: Full CA Factory configuration
            delegated_tasks: List of tasks that require delegation
            thresholds: Delegation threshold configuration
        """
        self.config = config
        self.delegated_tasks = delegated_tasks or []
        self.thresholds = thresholds or {}

        # Sub-agent tracking
        self._active_subagents: Dict[str, Any] = {}
        self._subagent_results: Dict[str, Any] = {}

        logger.info(
            f"Delegation Engine initialized with {len(self.delegated_tasks)} delegated task types"
        )

    def should_delegate(
        self,
        task_type: str,
        estimated_complexity: Dict[str, Any]
    ) -> bool:
        """
        Determine if a task should be delegated to a sub-agent.

        Args:
            task_type: Type of task
            estimated_complexity: Complexity metrics

        Returns:
            True if task should be delegated
        """
        # Force delegate tasks
        force_delegate = self.thresholds.get("force_delegate", [])
        if task_type in force_delegate:
            logger.info(f"Force delegating task type: {task_type}")
            return True

        # Never delegate tasks
        never_delegate = self.thresholds.get("never_delegate", [])
        if task_type in never_delegate:
            logger.info(f"Never delegating task type: {task_type}")
            return False

        # Check if task is in delegated list
        if task_type not in self.delegated_tasks:
            return False

        # Complexity-based delegation
        estimated_tokens = estimated_complexity.get("estimated_tokens", 0)
        tokens_threshold = self.thresholds.get("estimated_tokens_threshold", 40000)
        if estimated_tokens > tokens_threshold:
            logger.info(
                f"Delegating due to high token count: {estimated_tokens} > {tokens_threshold}"
            )
            return True

        # Multi-source threshold
        num_sources = estimated_complexity.get("num_sources", 1)
        multi_source_threshold = self.thresholds.get("multi_source_threshold", 5)
        if num_sources > multi_source_threshold:
            logger.info(
                f"Delegating due to multi-source: {num_sources} > {multi_source_threshold}"
            )
            return True

        # Reasoning depth threshold
        reasoning_depth = estimated_complexity.get("reasoning_depth", 1)
        depth_threshold = self.thresholds.get("reasoning_depth_threshold", 3)
        if reasoning_depth > depth_threshold:
            logger.info(
                f"Delegating due to reasoning depth: {reasoning_depth} > {depth_threshold}"
            )
            return True

        return False

    def create_context_bundle(
        self,
        task_type: str,
        inputs: Dict[str, Any],
        include_reasoning: bool = True
    ) -> Dict[str, Any]:
        """
        Create a context bundle for sub-agent execution.

        Args:
            task_type: Type of task
            inputs: Task inputs
            include_reasoning: Include reasoning traces

        Returns:
            Context bundle
        """
        bundle_config = self.config.get("context_bundle_config", {})

        bundle = {
            "task_type": task_type,
            "created_at": datetime.utcnow().isoformat(),
            "bundle_id": self._generate_bundle_id(task_type)
        }

        # Include inputs if configured
        if bundle_config.get("include_inputs", True):
            bundle["inputs"] = inputs

        # Include outputs placeholder
        if bundle_config.get("include_outputs", True):
            bundle["outputs"] = None

        # Include reasoning placeholder
        if bundle_config.get("include_reasoning", True) and include_reasoning:
            bundle["reasoning"] = []

        # Include tool calls placeholder
        if bundle_config.get("include_tool_calls", False):
            bundle["tool_calls"] = []

        # Apply compression if bundle exceeds max tokens
        max_bundle_tokens = bundle_config.get("max_bundle_tokens", 2000)
        bundle_tokens = self._estimate_bundle_tokens(bundle)

        if bundle_tokens > max_bundle_tokens:
            compression_strategy = bundle_config.get("compression_strategy", "summarize")
            bundle = self._compress_bundle(
                bundle,
                strategy=compression_strategy,
                target_tokens=max_bundle_tokens
            )

        logger.debug(f"Created context bundle: {bundle['bundle_id']}")

        return bundle

    async def spawn_subagent(
        self,
        agent_type: str,
        context_bundle: Dict[str, Any],
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Spawn a sub-agent to handle a task.

        Args:
            agent_type: Type of agent to spawn
            context_bundle: Context bundle for the agent
            timeout: Execution timeout in seconds

        Returns:
            Sub-agent execution results
        """
        subagent_id = self._generate_subagent_id(agent_type)

        logger.info(
            f"Spawning sub-agent {subagent_id} (type: {agent_type}, timeout: {timeout}s)"
        )

        # Check parallel sub-agent limit
        max_parallel = self.thresholds.get("max_parallel_subagents", 3)
        if len(self._active_subagents) >= max_parallel:
            logger.warning(
                f"Max parallel sub-agents reached ({max_parallel}), waiting..."
            )
            # Wait for a sub-agent to complete
            await self._wait_for_subagent_slot()

        # Register sub-agent
        self._active_subagents[subagent_id] = {
            "agent_type": agent_type,
            "started_at": datetime.utcnow(),
            "timeout": timeout,
            "status": "running"
        }

        try:
            # Execute sub-agent with timeout
            result = await asyncio.wait_for(
                self._execute_subagent(subagent_id, agent_type, context_bundle),
                timeout=timeout
            )

            self._active_subagents[subagent_id]["status"] = "completed"
            self._subagent_results[subagent_id] = result

            logger.info(f"Sub-agent {subagent_id} completed successfully")

            return result

        except asyncio.TimeoutError:
            logger.error(f"Sub-agent {subagent_id} timed out after {timeout}s")
            self._active_subagents[subagent_id]["status"] = "timeout"

            return {
                "error": "Sub-agent execution timeout",
                "subagent_id": subagent_id,
                "timeout": timeout
            }

        except Exception as e:
            logger.error(f"Sub-agent {subagent_id} failed: {str(e)}")
            self._active_subagents[subagent_id]["status"] = "failed"

            return {
                "error": str(e),
                "subagent_id": subagent_id
            }

        finally:
            # Clean up active sub-agent
            if subagent_id in self._active_subagents:
                del self._active_subagents[subagent_id]

    async def _execute_subagent(
        self,
        subagent_id: str,
        agent_type: str,
        context_bundle: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute sub-agent task (mock implementation).

        Args:
            subagent_id: Sub-agent identifier
            agent_type: Type of agent
            context_bundle: Context bundle

        Returns:
            Execution results
        """
        # Mock implementation
        # In production, this would:
        # 1. Create isolated agent instance
        # 2. Load context bundle
        # 3. Execute agent with limited resources
        # 4. Collect results and reasoning traces
        # 5. Return structured output

        logger.info(f"Executing sub-agent {subagent_id}")

        # Simulate work
        await asyncio.sleep(0.5)

        task_type = context_bundle.get("task_type")
        inputs = context_bundle.get("inputs", {})

        return {
            "subagent_id": subagent_id,
            "agent_type": agent_type,
            "task_type": task_type,
            "result": f"Mock sub-agent result for {task_type}",
            "reasoning": ["Step 1: Analyzed inputs", "Step 2: Retrieved evidence", "Step 3: Generated response"],
            "confidence": 0.88,
            "tokens_used": 2500,
            "execution_time_ms": 800,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _wait_for_subagent_slot(self) -> None:
        """Wait for a sub-agent slot to become available."""
        while len(self._active_subagents) >= self.thresholds.get("max_parallel_subagents", 3):
            await asyncio.sleep(0.1)

    def _generate_bundle_id(self, task_type: str) -> str:
        """Generate unique bundle ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        return f"bundle_{task_type}_{timestamp}"

    def _generate_subagent_id(self, agent_type: str) -> str:
        """Generate unique sub-agent ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        return f"subagent_{agent_type}_{timestamp}"

    def _estimate_bundle_tokens(self, bundle: Dict[str, Any]) -> int:
        """Estimate token count for bundle."""
        # Simple estimation: ~4 chars per token
        bundle_str = json.dumps(bundle)
        return len(bundle_str) // 4

    def _compress_bundle(
        self,
        bundle: Dict[str, Any],
        strategy: str,
        target_tokens: int
    ) -> Dict[str, Any]:
        """
        Compress context bundle to meet token budget.

        Args:
            bundle: Original bundle
            strategy: Compression strategy (summarize, truncate, smart)
            target_tokens: Target token count

        Returns:
            Compressed bundle
        """
        logger.info(f"Compressing bundle with strategy: {strategy}")

        if strategy == "truncate":
            # Simple truncation of inputs
            bundle_str = json.dumps(bundle)
            max_chars = target_tokens * 4
            if len(bundle_str) > max_chars:
                bundle_str = bundle_str[:max_chars]
                bundle = json.loads(bundle_str + "}")

        elif strategy == "summarize":
            # Summarize verbose fields (would use LLM in production)
            pass

        elif strategy == "smart":
            # Smart compression based on importance scores
            pass

        return bundle

    def get_active_subagents(self) -> Dict[str, Any]:
        """Get information about active sub-agents."""
        return self._active_subagents.copy()

    def get_subagent_result(self, subagent_id: str) -> Optional[Dict[str, Any]]:
        """Get result from completed sub-agent."""
        return self._subagent_results.get(subagent_id)

    def clear_subagent_results(self) -> None:
        """Clear cached sub-agent results."""
        self._subagent_results.clear()
        logger.info("Sub-agent results cache cleared")
