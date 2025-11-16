"""
CA Factory - Context Architect Factory

A high-reliability AI orchestration system that enforces context control,
automatic delegation, and built-in quality checks for clinical abstraction.

Principles:
- R (Reduction): Strict context control and token management
- D (Delegation): Automatic task distribution to specialized sub-agents
- Q (Quality): Built-in quality gates and performance monitoring
"""

__version__ = "1.0.0"
__author__ = "Model-Forward Clinical Abstraction Team"

from ca_factory.core.factory import CAFactory
from ca_factory.core.agent_manager import AgentManager
from ca_factory.core.delegation import DelegationEngine
from ca_factory.core.quality_control import QualityController

__all__ = [
    "CAFactory",
    "AgentManager",
    "DelegationEngine",
    "QualityController",
]
