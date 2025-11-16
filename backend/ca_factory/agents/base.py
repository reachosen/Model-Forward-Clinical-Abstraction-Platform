"""
Base Agent Class

Abstract base class for all CA Factory agents. Provides common functionality
for agent execution, validation, logging, and tool management.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for CA Factory agents.

    All specialized agents (Evidence Retrieval, Rule Evaluation, Q&A, etc.)
    must inherit from this class and implement the required abstract methods.
    """

    def __init__(
        self,
        agent_id: str,
        agent_type: str,
        config: Dict[str, Any]
    ):
        """
        Initialize base agent.

        Args:
            agent_id: Unique agent identifier
            agent_type: Type of agent (retrieval, evaluation, qa, etc.)
            config: Agent configuration from agent profile
        """
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.config = config

        # Extract configuration
        self.base_prompt = config.get("base_prompt", "")
        self.domain_specific_prompt = config.get("domain_specific_prompt", "")
        self.available_tools = config.get("available_tools", [])
        self.max_tool_calls = config.get("max_tool_calls", 10)
        self.max_tokens = config.get("max_tokens", 20000)
        self.timeout_seconds = config.get("timeout_seconds", 30)
        self.min_confidence_threshold = config.get("min_confidence_threshold", 0.7)
        self.require_evidence = config.get("require_evidence", True)

        # Execution tracking
        self._execution_count = 0
        self._total_tokens_used = 0
        self._tool_call_count = 0

        logger.info(
            f"Initialized {self.agent_type} agent: {self.agent_id}"
        )

    @abstractmethod
    async def execute(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the agent task.

        This is the main entry point for agent execution. Must be implemented
        by all subclasses.

        Args:
            inputs: Task inputs

        Returns:
            Task results
        """
        pass

    @abstractmethod
    def validate_inputs(
        self,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate input parameters.

        Args:
            inputs: Input parameters

        Returns:
            Validation result with pass/fail status and errors
        """
        pass

    @abstractmethod
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
        pass

    def build_prompt(
        self,
        inputs: Dict[str, Any],
        primed_knowledge: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Build the complete prompt for the agent.

        Args:
            inputs: Task inputs
            primed_knowledge: Optional primed knowledge chunks

        Returns:
            Complete prompt string
        """
        prompt_parts = []

        # System prompt
        if self.base_prompt:
            prompt_parts.append(self.base_prompt)

        # Domain-specific prompt
        if self.domain_specific_prompt:
            prompt_parts.append(self.domain_specific_prompt)

        # Primed knowledge
        if primed_knowledge:
            knowledge_section = self._format_primed_knowledge(primed_knowledge)
            prompt_parts.append(knowledge_section)

        # Task-specific instructions
        task_instructions = self._build_task_instructions(inputs)
        prompt_parts.append(task_instructions)

        # Tool instructions
        if self.available_tools:
            tool_instructions = self._build_tool_instructions()
            prompt_parts.append(tool_instructions)

        return "\n\n".join(prompt_parts)

    def _format_primed_knowledge(
        self,
        primed_knowledge: List[Dict[str, Any]]
    ) -> str:
        """
        Format primed knowledge for inclusion in prompt.

        Args:
            primed_knowledge: List of knowledge chunks

        Returns:
            Formatted knowledge section
        """
        sections = ["# Relevant Knowledge\n"]

        for i, knowledge in enumerate(primed_knowledge, 1):
            content = knowledge.get("content", "")
            sections.append(f"## Knowledge {i}\n{content}")

        return "\n\n".join(sections)

    def _build_task_instructions(
        self,
        inputs: Dict[str, Any]
    ) -> str:
        """
        Build task-specific instructions.

        Args:
            inputs: Task inputs

        Returns:
            Task instructions
        """
        # Default implementation - override in subclasses
        return f"# Task\n\nInputs: {inputs}"

    def _build_tool_instructions(self) -> str:
        """
        Build tool usage instructions.

        Returns:
            Tool instructions
        """
        if not self.available_tools:
            return ""

        instructions = [
            "# Available Tools\n",
            f"You have access to the following tools: {', '.join(self.available_tools)}",
            f"Maximum tool calls allowed: {self.max_tool_calls}"
        ]

        return "\n".join(instructions)

    async def call_llm(
        self,
        prompt: str,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Call the LLM API (mock implementation).

        In production, this would call Anthropic Claude API.

        Args:
            prompt: Complete prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            LLM response
        """
        # Mock implementation
        # In production, this would:
        # 1. Call Anthropic Claude API
        # 2. Handle retries and errors
        # 3. Parse structured output
        # 4. Track token usage

        logger.debug(f"Calling LLM for agent {self.agent_id}")

        max_tokens = max_tokens or self.max_tokens

        # Simulate token usage
        tokens_used = len(prompt) // 4 + 500  # Rough estimate

        self._total_tokens_used += tokens_used
        self._execution_count += 1

        return {
            "response": f"Mock LLM response for {self.agent_type} agent",
            "tokens_used": tokens_used,
            "model": "claude-3-sonnet-20240229"
        }

    async def call_tool(
        self,
        tool_name: str,
        tool_inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Call a tool.

        Args:
            tool_name: Tool name
            tool_inputs: Tool inputs

        Returns:
            Tool results
        """
        if tool_name not in self.available_tools:
            raise ValueError(f"Tool {tool_name} not available for this agent")

        if self._tool_call_count >= self.max_tool_calls:
            raise RuntimeError(
                f"Maximum tool calls ({self.max_tool_calls}) exceeded"
            )

        logger.debug(f"Calling tool: {tool_name}")

        # Mock tool execution
        # In production, this would call actual tools (MCP servers, APIs, etc.)

        self._tool_call_count += 1

        return {
            "tool_name": tool_name,
            "result": f"Mock result from {tool_name}",
            "execution_time_ms": 100
        }

    def check_confidence_threshold(
        self,
        confidence: float
    ) -> bool:
        """
        Check if confidence meets minimum threshold.

        Args:
            confidence: Confidence score (0-1)

        Returns:
            True if confidence meets threshold
        """
        meets_threshold = confidence >= self.min_confidence_threshold

        if not meets_threshold:
            logger.warning(
                f"Confidence {confidence} below threshold {self.min_confidence_threshold}"
            )

        return meets_threshold

    def log_execution(
        self,
        inputs: Dict[str, Any],
        outputs: Dict[str, Any],
        execution_time_ms: float
    ) -> None:
        """
        Log agent execution details.

        Args:
            inputs: Task inputs
            outputs: Task outputs
            execution_time_ms: Execution time in milliseconds
        """
        logger.info(
            f"Agent {self.agent_id} executed in {execution_time_ms:.1f}ms "
            f"(total executions: {self._execution_count}, "
            f"total tokens: {self._total_tokens_used})"
        )

    def get_stats(self) -> Dict[str, Any]:
        """
        Get agent statistics.

        Returns:
            Agent statistics
        """
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "execution_count": self._execution_count,
            "total_tokens_used": self._total_tokens_used,
            "tool_call_count": self._tool_call_count,
            "avg_tokens_per_execution": (
                self._total_tokens_used / self._execution_count
                if self._execution_count > 0 else 0
            )
        }

    def reset_stats(self) -> None:
        """Reset agent statistics."""
        self._execution_count = 0
        self._total_tokens_used = 0
        self._tool_call_count = 0

        logger.info(f"Agent {self.agent_id} statistics reset")


class AgentExecutionError(Exception):
    """Exception raised for agent execution errors."""

    def __init__(
        self,
        agent_id: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.agent_id = agent_id
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class AgentValidationError(Exception):
    """Exception raised for agent validation errors."""

    def __init__(
        self,
        agent_id: str,
        validation_type: str,
        errors: List[str]
    ):
        self.agent_id = agent_id
        self.validation_type = validation_type
        self.errors = errors
        super().__init__(
            f"Agent {agent_id} {validation_type} validation failed: {', '.join(errors)}"
        )
